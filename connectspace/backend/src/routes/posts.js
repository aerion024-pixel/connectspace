import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { pickImage, removeFile, uploadImage } from '../middleware/upload.js';
import { fail, str, wrap } from '../utils/http.js';

const router = Router();
router.use(requireAuth); // beranda, posting, like, dan komentar semuanya wajib login

// Validasi :id satu kali di sini; handler di bawah menerima req.postId yang pasti integer.
router.param('id', (req, res, next, value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) return fail(res, 404, 'Postingan tidak ditemukan.');
  req.postId = id;
  next();
});
router.param('commentId', (req, res, next, value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) return fail(res, 404, 'Komentar tidak ditemukan.');
  req.commentId = id;
  next();
});

// Komentar selalu di-JOIN ke users agar nama dan foto profil pengomentar ikut terbawa.
const COMMENT_SELECT = `
  SELECT c.id, c.post_id, c.user_id, c.comment, c.image,
         UNIX_TIMESTAMP(c.created_at) AS created_at,
         u.name AS author_name, u.avatar AS author_avatar
  FROM comments c JOIN users u ON u.id = c.user_id`;

// Ambil post (terbaru di atas) lengkap dengan penulis, jumlah like, status like milik user, dan komentar.
async function loadPosts(uid, postId = null) {
  const [posts] = await db.execute(
    `SELECT p.id, p.user_id, p.content, p.image,
            UNIX_TIMESTAMP(p.created_at) AS created_at,
            u.name AS author_name, u.avatar AS author_avatar,
            (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
            EXISTS (SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) AS liked
     FROM posts p JOIN users u ON u.id = p.user_id
     ${postId ? 'WHERE p.id = ?' : ''}
     ORDER BY p.created_at DESC, p.id DESC
     LIMIT 100`,
    postId ? [uid, postId] : [uid]
  );
  if (!posts.length) return [];

  // Placeholder dibangun dari jumlah id (bukan dari input pengguna), nilainya tetap di-bind.
  const ids = posts.map((p) => p.id);
  const [comments] = await db.execute(
    `${COMMENT_SELECT} WHERE c.post_id IN (${ids.map(() => '?').join(',')}) ORDER BY c.created_at ASC, c.id ASC`,
    ids
  );
  const byPost = {};
  comments.forEach((c) => (byPost[c.post_id] ||= []).push(c));

  return posts.map((p) => ({
    ...p,
    like_count: Number(p.like_count),
    liked: Boolean(Number(p.liked)),
    comments: byPost[p.id] || [],
  }));
}

// GET /api/posts: feed beranda.
router.get('/', wrap(async (req, res) => {
  res.json({ posts: await loadPosts(req.session.userId) });
}));

// POST /api/posts: status baru. Teks ATAU gambar wajib ada (tidak boleh kosong keduanya).
router.post('/', uploadImage('image'), wrap(async (req, res) => {
  const content = str(req.body.content).trim();
  const image = pickImage(req);

  if (image.error) return fail(res, 422, image.error);
  if (!content && !image.path) return fail(res, 422, 'Status tidak boleh kosong: isi teks atau lampirkan gambar.');
  if (content.length > 2000) return fail(res, 422, 'Teks status maksimal 2000 karakter.');

  const [result] = await db.execute(
    'INSERT INTO posts (user_id, content, image) VALUES (?, ?, ?)',
    [req.session.userId, content || null, image.path]
  );
  const [post] = await loadPosts(req.session.userId, result.insertId);
  res.status(201).json({ post });
}));

// PUT /api/posts/:id: hanya pemilik status yang boleh mengubahnya.
router.put('/:id', uploadImage('image'), wrap(async (req, res) => {
  const content = str(req.body.content).trim();
  const image = pickImage(req);
  if (image.error) return fail(res, 422, image.error);
  if (content.length > 2000) return fail(res, 422, 'Teks status maksimal 2000 karakter.');

  const [rows] = await db.execute('SELECT user_id, image FROM posts WHERE id = ?', [req.postId]);
  const post = rows[0];
  if (!post) return fail(res, 404, 'Postingan tidak ditemukan.');
  if (post.user_id !== req.session.userId) {
    return fail(res, 403, 'Anda hanya dapat mengedit postingan milik sendiri.');
  }

  const nextImage = image.path ?? (req.body.remove_image === 'true' ? null : post.image);
  if (!content && !nextImage) return fail(res, 422, 'Status tidak boleh kosong: isi teks atau lampirkan gambar.');

  await db.execute(
    'UPDATE posts SET content = ?, image = ? WHERE id = ? AND user_id = ?',
    [content || null, nextImage, req.postId, req.session.userId]
  );
  if (post.image && post.image !== nextImage) removeFile(post.image);

  const [updated] = await loadPosts(req.session.userId, req.postId);
  res.json({ post: updated });
}));

// DELETE /api/posts/:id: hanya pemilik. Dicek di server, bukan sekadar menyembunyikan tombol.
router.delete('/:id', wrap(async (req, res) => {
  const [rows] = await db.execute('SELECT user_id, image FROM posts WHERE id = ?', [req.postId]);
  const post = rows[0];
  if (!post) return fail(res, 404, 'Postingan tidak ditemukan.');
  if (post.user_id !== req.session.userId) {
    return fail(res, 403, 'Anda hanya dapat menghapus postingan milik sendiri.');
  }

  const [commentImages] = await db.execute(
    'SELECT image FROM comments WHERE post_id = ? AND image IS NOT NULL',
    [req.postId]
  );
  // Like dan komentar ikut terhapus lewat ON DELETE CASCADE.
  await db.execute('DELETE FROM posts WHERE id = ? AND user_id = ?', [req.postId, req.session.userId]);
  [post.image, ...commentImages.map((c) => c.image)].forEach((file) => removeFile(file));

  res.json({ message: 'Postingan berhasil dihapus.' });
}));

// POST /api/posts/:id/like: toggle. Sudah like = unlike, belum = like. Maksimal 1 like per user per post.
router.post('/:id/like', wrap(async (req, res) => {
  const uid = req.session.userId;
  const [exists] = await db.execute('SELECT id FROM posts WHERE id = ?', [req.postId]);
  if (!exists.length) return fail(res, 404, 'Postingan tidak ditemukan.');

  const [removed] = await db.execute('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [uid, req.postId]);
  const liked = removed.affectedRows === 0;
  if (liked) {
    // INSERT IGNORE + UNIQUE (user_id, post_id): klik ganda yang bersamaan tetap tidak membuat like dobel.
    await db.execute('INSERT IGNORE INTO likes (user_id, post_id) VALUES (?, ?)', [uid, req.postId]);
  }

  const [[{ total }]] = await db.execute('SELECT COUNT(*) AS total FROM likes WHERE post_id = ?', [req.postId]);
  res.json({ liked, like_count: Number(total) });
}));

// POST /api/posts/:id/comments: komentar teks, gambar (opsional), atau keduanya.
router.post('/:id/comments', uploadImage('image'), wrap(async (req, res) => {
  const comment = str(req.body.comment).trim();
  const image = pickImage(req);

  if (image.error) return fail(res, 422, image.error);
  if (!comment && !image.path) return fail(res, 422, 'Komentar tidak boleh kosong: isi teks atau lampirkan gambar.');
  if (comment.length > 1000) return fail(res, 422, 'Komentar maksimal 1000 karakter.');

  const [exists] = await db.execute('SELECT id FROM posts WHERE id = ?', [req.postId]);
  if (!exists.length) return fail(res, 404, 'Postingan tidak ditemukan.');

  const [result] = await db.execute(
    'INSERT INTO comments (post_id, user_id, comment, image) VALUES (?, ?, ?, ?)',
    [req.postId, req.session.userId, comment || null, image.path]
  );
  const [[created]] = await db.execute(`${COMMENT_SELECT} WHERE c.id = ?`, [result.insertId]);
  res.status(201).json({ comment: created });
}));

// PUT /api/posts/:id/comments/:commentId: hanya penulis komentar yang boleh mengubahnya.
router.put('/:id/comments/:commentId', uploadImage('image'), wrap(async (req, res) => {
  const comment = str(req.body.comment).trim();
  const image = pickImage(req);
  if (image.error) return fail(res, 422, image.error);
  if (comment.length > 1000) return fail(res, 422, 'Komentar maksimal 1000 karakter.');

  const [rows] = await db.execute(
    'SELECT user_id, image FROM comments WHERE id = ? AND post_id = ?',
    [req.commentId, req.postId]
  );
  const current = rows[0];
  if (!current) return fail(res, 404, 'Komentar tidak ditemukan.');
  if (current.user_id !== req.session.userId) {
    return fail(res, 403, 'Anda hanya dapat mengedit komentar milik sendiri.');
  }

  const nextImage = image.path ?? (req.body.remove_image === 'true' ? null : current.image);
  if (!comment && !nextImage) return fail(res, 422, 'Komentar tidak boleh kosong: isi teks atau lampirkan gambar.');

  await db.execute(
    'UPDATE comments SET comment = ?, image = ? WHERE id = ? AND post_id = ? AND user_id = ?',
    [comment || null, nextImage, req.commentId, req.postId, req.session.userId]
  );
  if (current.image && current.image !== nextImage) removeFile(current.image);

  const [[updated]] = await db.execute(`${COMMENT_SELECT} WHERE c.id = ?`, [req.commentId]);
  res.json({ comment: updated });
}));

// DELETE /api/posts/:id/comments/:commentId: hanya penulis komentar yang boleh menghapusnya.
router.delete('/:id/comments/:commentId', wrap(async (req, res) => {
  const [rows] = await db.execute(
    'SELECT user_id, image FROM comments WHERE id = ? AND post_id = ?',
    [req.commentId, req.postId]
  );
  const comment = rows[0];
  if (!comment) return fail(res, 404, 'Komentar tidak ditemukan.');
  if (comment.user_id !== req.session.userId) {
    return fail(res, 403, 'Anda hanya dapat menghapus komentar milik sendiri.');
  }

  await db.execute(
    'DELETE FROM comments WHERE id = ? AND post_id = ? AND user_id = ?',
    [req.commentId, req.postId, req.session.userId]
  );
  removeFile(comment.image);
  res.json({ message: 'Komentar berhasil dihapus.' });
}));

export default router;

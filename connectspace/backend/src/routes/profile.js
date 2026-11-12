import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db, USER_FIELDS } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { pickImage, removeFile, uploadImage } from '../middleware/upload.js';
import { fail, str, wrap } from '../utils/http.js';

const router = Router();
router.use(requireAuth); // seluruh route profil wajib login

// PUT /api/profile: ubah nama, bio, dan foto profil (upload file ATAU URL gambar).
router.put('/', uploadImage('avatar'), wrap(async (req, res) => {
  const uid = req.session.userId;
  const name = str(req.body.name).trim();
  const bio = str(req.body.bio).trim();
  const avatar = pickImage(req, 'avatar_url');

  if (!name || name.length > 100) return fail(res, 422, 'Nama wajib diisi (maksimal 100 karakter).');
  if (bio.length > 500) return fail(res, 422, 'Bio maksimal 500 karakter.');
  if (avatar.error) return fail(res, 422, avatar.error);

  const [[current]] = await db.execute('SELECT avatar FROM users WHERE id = ?', [uid]);
  const nextAvatar = avatar.path ?? current.avatar; // tidak memilih foto baru = foto lama dipertahankan
  await db.execute('UPDATE users SET name = ?, bio = ?, avatar = ? WHERE id = ?', [name, bio || null, nextAvatar, uid]);
  if (avatar.path && avatar.path !== current.avatar) removeFile(current.avatar); // buang file lama agar tidak menumpuk

  const [[user]] = await db.execute(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`, [uid]);
  res.json({ user });
}));

// PUT /api/profile/password: password lama WAJIB diverifikasi sebelum password baru disimpan.
router.put('/password', wrap(async (req, res) => {
  const uid = req.session.userId;
  const oldPassword = str(req.body.old_password);
  const newPassword = str(req.body.new_password);
  const errors = {};

  if (!oldPassword) errors.old_password = 'Password lama wajib diisi.';
  if (newPassword.length < 6) errors.new_password = 'Password baru minimal 6 karakter.';
  if (newPassword !== str(req.body.confirm_password)) errors.confirm_password = 'Konfirmasi password baru tidak cocok.';
  if (Object.keys(errors).length) return fail(res, 422, 'Periksa kembali isian formulir.', errors);

  const [[user]] = await db.execute('SELECT password FROM users WHERE id = ?', [uid]);
  if (!(await bcrypt.compare(oldPassword, user.password))) {
    return fail(res, 422, 'Password lama tidak sesuai.', { old_password: 'Password lama tidak sesuai.' });
  }

  await db.execute('UPDATE users SET password = ? WHERE id = ?', [await bcrypt.hash(newPassword, 10), uid]);
  res.json({ message: 'Password berhasil diubah.' });
}));

export default router;

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Ellipsis, Pencil, Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import Avatar from './Avatar.jsx';
import ImageInput from './ImageInput.jsx';

const EMPTY_IMAGE = { file: null, url: '' };

// Waktu dari server berupa detik (UNIX timestamp), ditampilkan menurut zona waktu browser.
const formatTime = (seconds) =>
  new Date(Number(seconds) * 1000).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

function Heart({ filled }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function OwnerActionsMenu({ label, editLabel = 'Edit', onEdit, onDelete, disabled = false }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  function chooseEdit() {
    setOpen(false);
    triggerRef.current?.focus();
    onEdit();
  }

  function chooseDelete() {
    setOpen(false);
    onDelete(triggerRef.current);
  }

  return (
    <div
      className="owner-menu"
      ref={rootRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="owner-menu-trigger"
        aria-label={`Aksi ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title={`Aksi ${label}`}
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
      >
        <Ellipsis size={20} aria-hidden="true" />
      </button>
      {open && (
        <div className="owner-menu-panel" id={menuId} role="menu" aria-label={`Aksi ${label}`}>
          <button type="button" className="owner-menu-item" role="menuitem" onClick={chooseEdit}>
            <Pencil size={16} aria-hidden="true" />
            <span>{editLabel}</span>
          </button>
          <button
            type="button"
            className="owner-menu-item danger"
            role="menuitem"
            onClick={chooseDelete}
          >
            <Trash2 size={16} aria-hidden="true" />
            <span>Hapus</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function PostCard({ post, onChange, onDelete }) {
  const { user } = useAuth();
  const [likeBusy, setLikeBusy] = useState(false);
  const [text, setText] = useState('');
  const [img, setImg] = useState(EMPTY_IMAGE);
  const [showImg, setShowImg] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [expandedImage, setExpandedImage] = useState(null);
  const [editingPost, setEditingPost] = useState(false);
  const [postDraft, setPostDraft] = useState('');
  const [postImageDraft, setPostImageDraft] = useState(EMPTY_IMAGE);
  const [removePostImage, setRemovePostImage] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentImageDraft, setCommentImageDraft] = useState(EMPTY_IMAGE);
  const [removeCommentImage, setRemoveCommentImage] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteRequest, setDeleteRequest] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [editError, setEditError] = useState('');
  const deleteCancelRef = useRef(null);
  const deleteTriggerRef = useRef(null);

  useEffect(() => {
    if (deleteRequest) deleteCancelRef.current?.focus();
    else if (deleteTriggerRef.current?.isConnected) deleteTriggerRef.current.focus();
  }, [deleteRequest]);

  // Tombol hapus hanya tampil untuk pemilik. Server tetap memeriksa kepemilikan (403 bila bukan pemilik).
  const isOwner = post.user_id === user.id;

  async function toggleLike() {
    setLikeBusy(true);
    setError('');
    try {
      const result = await api.post(`/api/posts/${post.id}/like`);
      onChange(post.id, { liked: result.liked, like_count: result.like_count });
    } catch (err) {
      setError(err.message);
    } finally {
      setLikeBusy(false);
    }
  }

  function requestPostDelete(trigger) {
    deleteTriggerRef.current = trigger;
    setDeleteError('');
    setDeleteRequest({ type: 'post' });
  }

  function requestCommentDelete(comment, trigger) {
    deleteTriggerRef.current = trigger;
    setDeleteError('');
    setDeleteRequest({ type: 'comment', comment });
  }

  async function confirmDelete() {
    if (!deleteRequest || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      if (deleteRequest.type === 'post') {
        await api.del(`/api/posts/${post.id}`);
        onDelete(post.id);
      } else {
        const { comment } = deleteRequest;
        await api.del(`/api/posts/${post.id}/comments/${comment.id}`);
        onChange(post.id, (current) => ({
          comments: current.comments.filter((item) => item.id !== comment.id),
        }));
        if (editingCommentId === comment.id) cancelCommentEdit();
      }
      setDeleteRequest(null);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleteBusy(false);
    }
  }

  function startPostEdit() {
    setEditingCommentId(null);
    setPostDraft(post.content || '');
    setPostImageDraft(EMPTY_IMAGE);
    setRemovePostImage(false);
    setEditError('');
    setEditingPost(true);
  }

  function cancelPostEdit() {
    setEditingPost(false);
    setPostImageDraft(EMPTY_IMAGE);
    setRemovePostImage(false);
    setEditError('');
  }

  function updatePostImage(value) {
    setPostImageDraft(value);
    if (value.file || value.url.trim()) setRemovePostImage(false);
  }

  async function savePost(e) {
    e.preventDefault();
    const body = new FormData();
    body.append('content', postDraft);
    if (postImageDraft.file) body.append('image', postImageDraft.file);
    else if (postImageDraft.url.trim()) body.append('image_url', postImageDraft.url.trim());
    if (removePostImage) body.append('remove_image', 'true');

    setSavingEdit(true);
    setEditError('');
    try {
      const { post: updated } = await api.put(`/api/posts/${post.id}`, body);
      onChange(post.id, { content: updated.content, image: updated.image });
      cancelPostEdit();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  function startCommentEdit(comment) {
    setEditingPost(false);
    setPostImageDraft(EMPTY_IMAGE);
    setEditingCommentId(comment.id);
    setCommentDraft(comment.comment || '');
    setCommentImageDraft(EMPTY_IMAGE);
    setRemoveCommentImage(false);
    setEditError('');
  }

  function cancelCommentEdit() {
    setEditingCommentId(null);
    setCommentImageDraft(EMPTY_IMAGE);
    setRemoveCommentImage(false);
    setEditError('');
  }

  function updateCommentImage(value) {
    setCommentImageDraft(value);
    if (value.file || value.url.trim()) setRemoveCommentImage(false);
  }

  async function saveComment(e, comment) {
    e.preventDefault();
    const body = new FormData();
    body.append('comment', commentDraft);
    if (commentImageDraft.file) body.append('image', commentImageDraft.file);
    else if (commentImageDraft.url.trim()) body.append('image_url', commentImageDraft.url.trim());
    if (removeCommentImage) body.append('remove_image', 'true');

    setSavingEdit(true);
    setEditError('');
    try {
      const { comment: updated } = await api.put(`/api/posts/${post.id}/comments/${comment.id}`, body);
      onChange(post.id, (current) => ({
        comments: current.comments.map((item) => (item.id === comment.id ? updated : item)),
      }));
      cancelCommentEdit();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function sendComment(e) {
    e.preventDefault();
    const url = img.url.trim();
    if (!text.trim() && !img.file && !url) {
      return setError('Komentar tidak boleh kosong: tulis teks atau lampirkan gambar.');
    }

    const body = new FormData();
    body.append('comment', text);
    if (img.file) body.append('image', img.file);
    else if (url) body.append('image_url', url);

    setSending(true);
    setError('');
    try {
      const { comment } = await api.post(`/api/posts/${post.id}/comments`, body);
      onChange(post.id, (current) => ({ comments: [...current.comments, comment] }));
      setText('');
      setImg(EMPTY_IMAGE);
      setShowImg(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <article className="post">
      <div className="post-main">
        <Avatar src={post.author_avatar} name={post.author_name} size={44} />
        <div className="post-body">
          <div className="post-head">
            <div className="post-author">
              <strong>{post.author_name}</strong>
              <time className="muted">{formatTime(post.created_at)}</time>
            </div>
            {isOwner && (
              <OwnerActionsMenu
                label="postingan"
                editLabel={editingPost ? 'Batal edit' : 'Edit'}
                onEdit={editingPost ? cancelPostEdit : startPostEdit}
                onDelete={requestPostDelete}
                disabled={savingEdit || deleteBusy}
              />
            )}
          </div>

          {editingPost ? (
            <form className="edit-form" onSubmit={savePost}>
              <label className="field">
                <span className="field-label">Teks status</span>
                <textarea value={postDraft} onChange={(e) => setPostDraft(e.target.value)} maxLength={2000} />
              </label>
              {post.image && !removePostImage && (
                <div className="edit-current-image">
                  <img src={post.image} alt="Gambar status saat ini" />
                  <button type="button" className="link" onClick={() => setRemovePostImage(true)}>
                    Hapus gambar saat ini
                  </button>
                </div>
              )}
              {post.image && removePostImage && (
                <button type="button" className="link" onClick={() => setRemovePostImage(false)}>
                  Pertahankan gambar saat ini
                </button>
              )}
              <ImageInput file={postImageDraft.file} url={postImageDraft.url} onChange={updatePostImage} />
              {editError && <p className="field-error" role="alert">{editError}</p>}
              <div className="edit-actions">
                <button className="btn primary small" disabled={savingEdit}>
                  {savingEdit ? 'Menyimpan…' : 'Simpan perubahan'}
                </button>
                <button type="button" className="btn small" onClick={cancelPostEdit} disabled={savingEdit}>
                  Batal
                </button>
              </div>
            </form>
          ) : (
            <>
              {post.content && <p className="post-text">{post.content}</p>}
              {post.image && (
                <img
                  className={`post-image${expandedImage === post.id ? ' expanded' : ''}`}
                  src={post.image}
                  alt="Gambar pada status"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onClick={() => setExpandedImage((current) => (current === post.id ? null : post.id))}
                  title={expandedImage === post.id ? 'Klik untuk tutup zoom' : 'Klik untuk zoom'}
                />
              )}
            </>
          )}

          <div className="post-actions">
            <button
              type="button"
              className={`like-btn${post.liked ? ' liked' : ''}`}
              onClick={toggleLike}
              disabled={likeBusy}
              aria-pressed={post.liked}
            >
              <Heart filled={post.liked} />
              {post.liked ? 'Batal suka' : 'Suka'}
              <span className="count">{post.like_count}</span>
            </button>
            <span className="muted">{post.comments.length} komentar</span>
          </div>
        </div>
      </div>

      {post.comments.map((c) => {
        const isEditingComment = editingCommentId === c.id;
        return (
          <div className="thread-row" key={c.id}>
            <Avatar src={c.author_avatar} name={c.author_name} size={32} />
            <div className="comment">
              <div className="comment-head">
                <strong>{c.author_name}</strong>
                <time className="muted">{formatTime(c.created_at)}</time>
                {c.user_id === user.id && (
                  <OwnerActionsMenu
                    label="komentar"
                    editLabel={isEditingComment ? 'Batal edit' : 'Edit'}
                    onEdit={() => (isEditingComment ? cancelCommentEdit() : startCommentEdit(c))}
                    onDelete={(trigger) => requestCommentDelete(c, trigger)}
                    disabled={savingEdit || deleteBusy}
                  />
                )}
              </div>
              {isEditingComment ? (
                <form className="edit-form" onSubmit={(e) => saveComment(e, c)}>
                  <label className="field">
                    <span className="field-label">Teks komentar</span>
                    <textarea value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} maxLength={1000} />
                  </label>
                  {c.image && !removeCommentImage && (
                    <div className="edit-current-image">
                      <img src={c.image} alt="Gambar komentar saat ini" />
                      <button type="button" className="link" onClick={() => setRemoveCommentImage(true)}>
                        Hapus gambar saat ini
                      </button>
                    </div>
                  )}
                  {c.image && removeCommentImage && (
                    <button type="button" className="link" onClick={() => setRemoveCommentImage(false)}>
                      Pertahankan gambar saat ini
                    </button>
                  )}
                  <ImageInput file={commentImageDraft.file} url={commentImageDraft.url} onChange={updateCommentImage} />
                  {editError && <p className="field-error" role="alert">{editError}</p>}
                  <div className="edit-actions">
                    <button className="btn primary small" disabled={savingEdit}>
                      {savingEdit ? 'Menyimpan…' : 'Simpan perubahan'}
                    </button>
                    <button type="button" className="btn small" onClick={cancelCommentEdit} disabled={savingEdit}>
                      Batal
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {c.comment && <p>{c.comment}</p>}
                  {c.image && (
                    <img
                      className={`comment-image${expandedImage === c.id ? ' expanded' : ''}`}
                      src={c.image}
                      alt="Gambar pada komentar"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onClick={() => setExpandedImage((current) => (current === c.id ? null : c.id))}
                      title={expandedImage === c.id ? 'Klik untuk tutup zoom' : 'Klik untuk zoom'}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}

      <form className="thread-row" onSubmit={sendComment}>
        <Avatar src={user.avatar} name={user.name} size={32} />
        <div className="comment-form-main">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tulis komentar"
            aria-label="Tulis komentar"
            maxLength={1000}
          />
          {showImg && <ImageInput file={img.file} url={img.url} onChange={setImg} />}
          <div className="comment-form-actions">
            <button
              type="button"
              className="link"
              onClick={() => {
                setShowImg(!showImg);
                setImg(EMPTY_IMAGE);
              }}
            >
              {showImg ? 'Tanpa gambar' : 'Lampirkan gambar'}
            </button>
            <button className="btn primary small" disabled={sending}>
              {sending ? 'Mengirim…' : 'Kirim'}
            </button>
          </div>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </form>

      {deleteRequest &&
        createPortal(
          <div
            className="confirm-overlay"
            onClick={(event) => {
              if (event.target === event.currentTarget && !deleteBusy) setDeleteRequest(null);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && !deleteBusy) setDeleteRequest(null);
            }}
          >
            <section
              className="confirm-dialog"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby={`delete-confirm-title-${post.id}`}
              aria-describedby={`delete-confirm-description-${post.id}`}
            >
              <h2 id={`delete-confirm-title-${post.id}`}>
                Hapus {deleteRequest.type === 'post' ? 'postingan' : 'komentar'}?
              </h2>
              <p id={`delete-confirm-description-${post.id}`}>
                {deleteRequest.type === 'post'
                  ? 'Postingan, like, dan semua komentarnya akan dihapus. Tindakan ini tidak dapat dibatalkan.'
                  : 'Komentar ini akan dihapus. Tindakan ini tidak dapat dibatalkan.'}
              </p>
              {deleteError && <p className="field-error" role="alert">{deleteError}</p>}
              <div className="confirm-actions">
                <button
                  ref={deleteCancelRef}
                  type="button"
                  className="btn"
                  onClick={() => setDeleteRequest(null)}
                  disabled={deleteBusy}
                >
                  Batal
                </button>
                <button type="button" className="btn danger" onClick={confirmDelete} disabled={deleteBusy}>
                  {deleteBusy ? 'Menghapus…' : 'Hapus'}
                </button>
              </div>
            </section>
          </div>,
          document.body
        )}
    </article>
  );
}

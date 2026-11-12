import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import Avatar from './Avatar.jsx';
import ImageInput from './ImageInput.jsx';

const EMPTY_IMAGE = { file: null, url: '' };

export default function Composer({ onCreated }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [img, setImg] = useState(EMPTY_IMAGE);
  const [showImg, setShowImg] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const url = img.url.trim();

    // Aturan: teks ATAU gambar harus ada. Server memeriksa hal yang sama.
    if (!content.trim() && !img.file && !url) {
      return setError('Status tidak boleh kosong: isi teks atau lampirkan gambar.');
    }

    const body = new FormData();
    body.append('content', content);
    if (img.file) body.append('image', img.file);
    else if (url) body.append('image_url', url);

    setBusy(true);
    setError('');
    try {
      const { post } = await api.post('/api/posts', body);
      onCreated(post); // tampil paling atas di feed
      setContent('');
      setImg(EMPTY_IMAGE);
      setShowImg(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="composer" onSubmit={submit}>
      <div className="composer-row">
        <Avatar src={user.avatar} name={user.name} size={44} />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Apa yang ingin kamu bagikan hari ini?"
          aria-label="Tulis status"
          maxLength={2000}
        />
      </div>

      {showImg && <ImageInput file={img.file} url={img.url} onChange={setImg} />}
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}

      <div className="composer-actions">
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
        <button className="btn primary" disabled={busy}>
          {busy ? 'Memposting…' : 'Posting'}
        </button>
      </div>
    </form>
  );
}

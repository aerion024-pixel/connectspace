import { useEffect, useRef, useState } from 'react';

// Pilih gambar lewat upload file ATAU URL gambar. Nilai: { file: File | null, url: string }.
export default function ImageInput({ file, url, onChange }) {
  const [mode, setMode] = useState('file');
  const [objectUrl, setObjectUrl] = useState('');
  const fileRef = useRef(null);

  // Pratinjau file lokal. Saat nilai dikosongkan dari luar (mis. setelah kirim), input file ikut direset.
  useEffect(() => {
    if (!file) {
      setObjectUrl('');
      if (fileRef.current) fileRef.current.value = '';
      return undefined;
    }
    const next = URL.createObjectURL(file);
    setObjectUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  const clear = () => onChange({ file: null, url: '' });
  const switchMode = (next) => {
    setMode(next);
    clear();
  };

  const preview = mode === 'file' ? objectUrl : url.trim();

  return (
    <div className="image-input">
      <div className="tabs">
        <button type="button" className={mode === 'file' ? 'active' : ''} onClick={() => switchMode('file')}>
          Upload file
        </button>
        <button type="button" className={mode === 'url' ? 'active' : ''} onClick={() => switchMode('url')}>
          URL gambar
        </button>
      </div>

      {mode === 'file' ? (
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          aria-label="Pilih file gambar"
          onChange={(e) => onChange({ file: e.target.files[0] || null, url: '' })}
        />
      ) : (
        <input
          type="url"
          placeholder="https://contoh.com/gambar.jpg"
          aria-label="URL gambar"
          value={url}
          onChange={(e) => onChange({ file: null, url: e.target.value })}
        />
      )}

      {preview && (
        <div className="preview">
          <img src={preview} alt="Pratinjau gambar" referrerPolicy="no-referrer" />
          <button type="button" className="link" onClick={clear}>
            Hapus gambar
          </button>
        </div>
      )}
    </div>
  );
}

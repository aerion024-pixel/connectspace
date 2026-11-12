import { useEffect, useState } from 'react';

// Foto profil pengguna. Bila belum ada (atau gagal dimuat), tampil inisial nama.
export default function Avatar({ src, name = '', size = 40 }) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  const box = { width: size, height: size };

  if (!src || broken) {
    return (
      <span className="avatar avatar-fallback" style={{ ...box, fontSize: size * 0.42 }} aria-hidden="true">
        {name.trim().charAt(0).toUpperCase() || '?'}
      </span>
    );
  }

  // alt kosong: nama pengguna sudah tertulis di sebelah foto.
  return <img className="avatar" style={box} src={src} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} />;
}

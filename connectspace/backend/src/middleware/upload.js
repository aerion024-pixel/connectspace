import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

export const UPLOAD_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

class UploadError extends Error {}

// Hanya format ini yang diterima. SVG sengaja tidak diizinkan karena bisa memuat script.
const EXT_BY_MIME = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp' };

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    // Nama file diacak. Nama asli dari klien tidak pernah dipakai (mencegah path traversal & tabrakan nama).
    filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + EXT_BY_MIME[file.mimetype]),
  }),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    EXT_BY_MIME[file.mimetype]
      ? cb(null, true)
      : cb(new UploadError('Format gambar harus JPG, PNG, GIF, atau WEBP.')),
});

// Content-Type dari klien bisa dipalsukan, jadi isi file ikut dicek lewat "magic bytes".
function hasImageSignature(filePath) {
  const head = Buffer.alloc(12);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, head, 0, 12, 0);
  fs.closeSync(fd);
  const text = (from, to) => head.toString('latin1', from, to);
  return (
    (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) || // JPEG
    head.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) || // PNG
    text(0, 4) === 'GIF8' || // GIF
    (text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP') // WEBP
  );
}

// Hapus file lokal hasil upload. URL eksternal dan path lain tidak disentuh.
export function removeFile(publicPath) {
  if (typeof publicPath !== 'string' || !publicPath.startsWith('/uploads/')) return;
  fs.unlink(path.join(UPLOAD_DIR, path.basename(publicPath)), () => {});
}

// Middleware: terima 1 file gambar pada field `field` (opsional) dan validasi isinya.
export const uploadImage = (field) => (req, res, next) =>
  upload.single(field)(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Ukuran gambar maksimal 2 MB.'
          : err instanceof UploadError
            ? err.message
            : 'Gagal mengunggah berkas.';
      return res.status(400).json({ message });
    }
    if (req.file) {
      const saved = `/uploads/${req.file.filename}`;
      if (!hasImageSignature(req.file.path)) {
        removeFile(saved);
        return res.status(400).json({ message: 'Berkas bukan gambar yang valid.' });
      }
      // Jika permintaan akhirnya ditolak (status >= 400), file yang terlanjur tersimpan ikut dibuang.
      res.on('finish', () => {
        if (res.statusCode >= 400) removeFile(saved);
      });
    }
    next();
  });

// Tentukan gambar untuk disimpan ke database: file upload (diutamakan) ATAU URL gambar.
// Hasil: { path } (null jika tidak ada gambar) atau { error } jika URL tidak valid.
export function pickImage(req, urlField = 'image_url') {
  if (req.file) return { path: `/uploads/${req.file.filename}` };

  const url = typeof req.body[urlField] === 'string' ? req.body[urlField].trim() : '';
  if (!url) return { path: null };

  try {
    const { protocol } = new URL(url);
    if (!['http:', 'https:'].includes(protocol) || url.length > 255) throw new Error('invalid');
  } catch {
    return { error: 'URL gambar tidak valid (harus diawali http:// atau https://, maksimal 255 karakter).' };
  }
  return { path: url };
}

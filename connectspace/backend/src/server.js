import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import { UPLOAD_DIR } from './middleware/upload.js';
import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import profileRoutes from './routes/profile.js';

const app = express();
const PORT = Number(process.env.PORT) || 5000;

if (!process.env.SESSION_SECRET) {
  console.warn('PERINGATAN: SESSION_SECRET belum diisi di file .env (memakai nilai bawaan, jangan dipakai di produksi).');
}

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

// Sesi login disimpan di server; browser hanya memegang cookie id sesi (httpOnly, tidak terbaca JavaScript).
// Catatan: store bawaan (memori) hilang saat server di-restart. Untuk produksi pakai store persisten
// dan tambahkan secure: true pada cookie bila situs dilayani lewat HTTPS.
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'ganti-secret-ini-di-file-env',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 },
  })
);

// Gambar hasil upload. nosniff: browser tidak boleh menebak-nebak tipe konten file.
app.use('/uploads', express.static(UPLOAD_DIR, { setHeaders: (res) => res.set('X-Content-Type-Options', 'nosniff') }));

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/posts', postRoutes);
app.use('/api', (req, res) => res.status(404).json({ message: 'Endpoint tidak ditemukan.' }));

// Error handler terakhir: detail error hanya masuk log server, tidak dikirim ke klien.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Format data tidak valid.' });
  console.error(err);
  res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
});

app.listen(PORT, () => console.log(`UmaThreads API berjalan di http://localhost:${PORT}`));

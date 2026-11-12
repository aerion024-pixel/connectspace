import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db, USER_FIELDS } from '../db.js';
import { guestOnly } from '../middleware/auth.js';
import { EMAIL_RE, fail, str, wrap } from '../utils/http.js';

const router = Router();

// Hash palsu: bcrypt.compare tetap dijalankan walau email tidak ditemukan,
// sehingga waktu respons tidak membocorkan email mana yang terdaftar.
const DUMMY_HASH = bcrypt.hashSync('tidak-dipakai', 10);

// Buat sesi baru (regenerate mencegah session fixation), lalu simpan id user di dalamnya.
const startSession = (req, userId) =>
  new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = userId;
      resolve();
    });
  });

// POST /api/auth/register: validasi, simpan (password di-hash), lalu AUTO-LOGIN.
router.post('/register', guestOnly, wrap(async (req, res) => {
  const name = str(req.body.name).trim();
  const email = str(req.body.email).trim().toLowerCase();
  const password = str(req.body.password);
  const errors = {};

  if (!name) errors.name = 'Nama lengkap wajib diisi.';
  else if (name.length > 100) errors.name = 'Nama maksimal 100 karakter.';

  if (!EMAIL_RE.test(email) || email.length > 150) {
    errors.email = 'Format email tidak valid.';
  } else {
    const [rows] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length) errors.email = 'Email sudah terdaftar.';
  }

  if (password.length < 6) errors.password = 'Password minimal 6 karakter.';
  if (password !== str(req.body.confirm_password)) errors.confirm_password = 'Konfirmasi password tidak cocok.';

  if (Object.keys(errors).length) return fail(res, 422, 'Periksa kembali isian formulir.', errors);

  let userId;
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.execute('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hash]);
    userId = result.insertId;
  } catch (err) {
    // Dua pendaftar dengan email sama di waktu bersamaan: unique key di database yang menang.
    if (err.code === 'ER_DUP_ENTRY') {
      return fail(res, 422, 'Periksa kembali isian formulir.', { email: 'Email sudah terdaftar.' });
    }
    throw err;
  }

  // Aturan studi kasus: JANGAN arahkan ke form login. Sesi dibuat sekarang juga,
  // lalu klien langsung diarahkan ke Beranda.
  await startSession(req, userId);
  const [[user]] = await db.execute(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`, [userId]);
  res.status(201).json({ user });
}));

// POST /api/auth/login: password diverifikasi terhadap hash bcrypt di database.
router.post('/login', guestOnly, wrap(async (req, res) => {
  const email = str(req.body.email).trim().toLowerCase();
  const password = str(req.body.password);
  if (!email || !password) return fail(res, 422, 'Email dan password wajib diisi.');

  const [rows] = await db.execute('SELECT id, password FROM users WHERE email = ?', [email]);
  const found = rows[0];
  const valid = await bcrypt.compare(password, found ? found.password : DUMMY_HASH);
  if (!found || !valid) return fail(res, 401, 'Email atau password salah.');

  await startSession(req, found.id);
  const [[user]] = await db.execute(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`, [found.id]);
  res.json({ user });
}));

// POST /api/auth/logout: sesi dihancurkan di server, cookie dihapus di browser.
router.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.json({ message: 'Anda sudah logout.' });
  });
});

// GET /api/auth/me: dipakai frontend untuk mengetahui apakah sesi masih aktif.
router.get('/me', wrap(async (req, res) => {
  if (!req.session.userId) return fail(res, 401, 'Belum login.');

  const [rows] = await db.execute(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`, [req.session.userId]);
  if (!rows[0]) {
    // Akun sudah dihapus tetapi sesinya masih ada: bersihkan.
    return req.session.destroy(() => fail(res, 401, 'Sesi tidak valid.'));
  }
  res.json({ user: rows[0] });
}));

export default router;

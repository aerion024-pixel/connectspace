# UmaThreads: MVP Media Sosial Internal

Aplikasi media sosial sederhana untuk skenario UJK Junior Web Programmer: registrasi dengan auto-login,
login/logout dengan route guard, profil dan foto profil, ubah password, status dengan gambar,
edit status dan komentar milik sendiri, like (toggle), dan komentar dengan gambar.

**Stack:** React 18 + Vite, Node.js + Express 4, MySQL (`mysql2`, prepared statement), `express-session`,
`bcryptjs`, `multer`.

## Menjalankan

Prasyarat: Node.js 18 atau lebih baru, dan MySQL/MariaDB (mis. XAMPP).

**1. Database.** Nyalakan MySQL, lalu impor `database/schema.sql`
(phpMyAdmin > Import, atau `mysql -u root -p < database/schema.sql`).
File ini membuat database `connectspace` beserta 4 tabelnya.

**2. Backend** (terminal pertama):

```bash
cd backend
cp .env.example .env      # Windows: copy .env.example .env, lalu sesuaikan DB_USER / DB_PASSWORD
npm install
npm run dev               # API di http://localhost:5000
```

**3. Frontend** (terminal kedua):

```bash
cd frontend
npm install
npm run dev               # buka http://localhost:5173
```

Bila port backend bukan 5000, ubah juga alamat proxy di `frontend/vite.config.js`.

## Struktur

```
database/schema.sql            skema 4 tabel + foreign key + unique constraint
backend/src/
  server.js                    Express, session, folder /uploads, error handler
  db.js                        pool koneksi MySQL
  middleware/auth.js           requireAuth (wajib login), guestOnly (hanya tamu)
  middleware/upload.js         multer + validasi gambar + helper URL gambar
  routes/auth.js               register (auto-login), login, logout, me
  routes/profile.js            ubah profil/foto, ubah password
  routes/posts.js              feed, posting, edit/hapus, like (toggle), komentar
frontend/src/
  App.jsx                      routing + route guard (ProtectedLayout, GuestLayout)
  auth.jsx                     context sesi login
  api.js                       pembungkus fetch
  pages/                       Login, Register, Feed, Profile
  components/                  Navbar, Composer, PostCard, ImageInput, Avatar, ...
```

## Pemetaan ke rubrik penilaian

| Komponen rubrik | Letak implementasi |
|---|---|
| 1. Struktur dan relasi basis data | `database/schema.sql`: kolom `users.avatar`, `posts.image`, `comments.image`; FK `ON DELETE CASCADE`; `UNIQUE (user_id, post_id)` pada `likes` |
| 2. Registrasi dan auto-login | `routes/auth.js` (`POST /register` memanggil `startSession` setelah simpan), `pages/Register.jsx` (lalu `navigate('/')`) |
| 3. Autentikasi dan route guard | `middleware/auth.js`, `App.jsx` (`ProtectedLayout`, `GuestLayout`), logout di `routes/auth.js` |
| 4. Profil dan foto profil | `routes/profile.js`, `pages/Profile.jsx`; avatar tampil di `Navbar`, `PostCard`, dan tiap komentar |
| 5. CRUD status dan gambar | `routes/posts.js` (`POST /`, `GET /`, `PUT /:id`, `DELETE /:id`), `Composer.jsx`, `PostCard.jsx` |
| 6. Toggle like dan komentar bergambar | `routes/posts.js` (`POST /:id/like`, `POST /:id/comments`, `PUT /:id/comments/:commentId`) |
| 7. Keamanan dan kerapian kode | `db.execute` dengan placeholder, bcrypt, `middleware/upload.js`, kode dipisah per tanggung jawab |

## Endpoint API

| Method dan path | Fungsi | Login |
|---|---|---|
| `POST /api/auth/register` | Daftar, sesi langsung aktif | tidak |
| `POST /api/auth/login` | Masuk | tidak |
| `POST /api/auth/logout` | Hancurkan sesi | |
| `GET /api/auth/me` | Cek sesi aktif | |
| `PUT /api/profile` | Ubah nama, bio, foto (file atau URL) | ya |
| `PUT /api/profile/password` | Ubah password (butuh password lama) | ya |
| `GET /api/posts` | Feed, terbaru di atas | ya |
| `POST /api/posts` | Buat status (teks dan/atau gambar) | ya |
| `PUT /api/posts/:id` | Edit status milik sendiri (teks dan gambar opsional) | ya |
| `DELETE /api/posts/:id` | Hapus status (hanya pemilik, selain itu 403) | ya |
| `POST /api/posts/:id/like` | Toggle like/unlike | ya |
| `POST /api/posts/:id/comments` | Tambah komentar (teks dan/atau gambar) | ya |
| `PUT /api/posts/:id/comments/:commentId` | Edit komentar milik sendiri di post sendiri atau orang lain | ya |
| `DELETE /api/posts/:id/comments/:commentId` | Hapus komentar milik sendiri di post sendiri atau orang lain | ya |

## Uji cepat sesuai alur di soal

1. Daftar akun baru: langsung masuk Beranda tanpa melewati form login. Coba email yang sama dua kali (ditolak),
   password kurang dari 6 karakter, dan konfirmasi yang tidak cocok.
2. Saat sudah login, buka `/login` atau `/register`: dialihkan ke Beranda. Klik Logout: kembali ke Login.
   Setelah logout, buka `/` atau `/profile` lewat URL langsung: dilempar ke Login dengan pesan peringatan.
3. Di Profil, ubah nama, bio, dan foto. Foto baru muncul di navbar, di postingan milik sendiri, dan di komentar.
   Di "Ubah password", isi password lama yang salah: ditolak.
4. Buat status teks saja, gambar saja (upload file dan URL), dan keduanya. Status baru muncul paling atas.
   Status tanpa teks dan tanpa gambar ditolak.
5. Klik Suka dua kali: like bertambah lalu batal. Dengan dua akun, pastikan hanya pemilik post dapat mengedit atau menghapusnya.
6. Kirim komentar teks, gambar, dan keduanya. Edit komentar dari akun sendiri pada post sendiri dan post akun lain;
  pastikan hanya penulisnya yang dapat mengedit atau menghapus komentar tersebut, termasuk melalui endpoint.

## Catatan keamanan

- Semua query memakai placeholder lewat `db.execute()` (prepared statement), tidak ada penggabungan string dari input pengguna.
- Password disimpan sebagai hash bcrypt. Pesan login salah tidak membedakan "email tidak ada" dan "password salah".
- Sesi: cookie `httpOnly` + `SameSite=Lax`, dan id sesi dibuat ulang saat login/registrasi (anti session fixation).
- Upload gambar: hanya JPG/PNG/GIF/WEBP (SVG ditolak), maksimal 2 MB, isi file dicek lewat magic bytes,
  nama file diacak, dan file yang permintaannya gagal ikut dihapus. URL gambar hanya boleh `http://` atau `https://`.
- Kepemilikan postingan diperiksa di server (bukan sekadar menyembunyikan tombol). Teks dari pengguna ditampilkan
  lewat React sehingga otomatis di-escape (anti XSS).
- Endpoint edit dan hapus komentar memeriksa pemilik konten di server. Gambar lama dapat dipertahankan,
  diganti, atau dihapus saat edit.

## Batasan yang disengaja

- Sesi disimpan di memori server: restart server berarti login ulang. Untuk produksi pakai session store persisten
  dan aktifkan `secure: true` pada cookie bila memakai HTTPS.
- Feed menampilkan 100 postingan terbaru, tanpa pagination.

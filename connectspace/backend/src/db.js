import 'dotenv/config';
import mysql from 'mysql2/promise';

// Semua query di proyek ini memakai placeholder (?) lewat db.execute(),
// sehingga dijalankan sebagai prepared statement dan aman dari SQL Injection.
export const db = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'connectspace',
  waitForConnections: true,
  connectionLimit: 10,
});

// Kolom user yang aman dikirim ke klien (tanpa password).
export const USER_FIELDS = 'id, name, email, avatar, bio';

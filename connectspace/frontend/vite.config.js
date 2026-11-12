import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Permintaan /api dan /uploads diteruskan ke backend Express, jadi browser melihat
// semuanya sebagai satu origin (cookie sesi bekerja tanpa CORS).
// Jika PORT backend bukan 5000, ubah alamat di bawah ini.
const backend = 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': backend, '/uploads': backend },
  },
});

// Membungkus handler async agar error otomatis diteruskan ke error handler Express 4.
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Memastikan nilai dari body benar-benar string (menolak array/objek yang dikirim klien).
export const str = (value) => (typeof value === 'string' ? value : '');

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Respons error seragam: { message, errors? }. "errors" berisi pesan per field untuk formulir.
export const fail = (res, status, message, errors) =>
  res.status(status).json(errors ? { message, errors } : { message });

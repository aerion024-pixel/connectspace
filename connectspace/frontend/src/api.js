// Pembungkus fetch: selalu membawa cookie sesi, mengirim JSON atau FormData, dan melempar
// Error berisi pesan dari server (error.errors = pesan per field untuk formulir).
async function request(method, url, body) {
  const isForm = body instanceof FormData;

  let res;
  try {
    res = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch {
    throw Object.assign(new Error('Tidak dapat terhubung ke server. Pastikan backend sudah berjalan.'), {
      status: 0,
      errors: {},
    });
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Sesi habis saat halaman masih terbuka: AuthProvider akan mengembalikan pengguna ke halaman login.
    if (res.status === 401 && !url.startsWith('/api/auth/')) {
      window.dispatchEvent(new Event('session-expired'));
    }
    const fallback =
      res.status >= 500
        ? 'Server tidak merespons. Pastikan backend dan database sudah berjalan.'
        : 'Terjadi kesalahan. Coba lagi.';
    throw Object.assign(new Error(data.message || fallback), { status: res.status, errors: data.errors || {} });
  }
  return data;
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  del: (url) => request('DELETE', url),
};

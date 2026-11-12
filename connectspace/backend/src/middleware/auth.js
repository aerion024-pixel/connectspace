// Route guard: hanya pengguna dengan sesi aktif yang boleh lewat.
export function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Silakan login terlebih dahulu.' });
  }
  next();
}

// Kebalikannya: pengguna yang sudah login tidak boleh login/registrasi lagi.
export function guestOnly(req, res, next) {
  if (req.session.userId) {
    return res.status(403).json({ message: 'Anda sudah login.' });
  }
  next();
}

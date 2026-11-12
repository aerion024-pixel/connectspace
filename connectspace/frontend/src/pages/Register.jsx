import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import AuthShell from '../components/AuthShell.jsx';
import Field from '../components/Field.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm_password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();

    // Validasi di sisi klien untuk umpan balik cepat. Server memvalidasi ulang (termasuk email unik).
    const found = {};
    if (!form.name.trim()) found.name = 'Nama lengkap wajib diisi.';
    if (!EMAIL_RE.test(form.email.trim())) found.email = 'Format email tidak valid.';
    if (form.password.length < 6) found.password = 'Password minimal 6 karakter.';
    if (form.password !== form.confirm_password) found.confirm_password = 'Konfirmasi password tidak cocok.';
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      await register(form); // server menyimpan akun DAN langsung membuat sesi login
      navigate('/', { replace: true }); // lanjut ke Beranda, bukan ke form login
    } catch (err) {
      setErrors(Object.keys(err.errors).length ? err.errors : { form: err.message });
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Buat akun baru" formClassName="auth-form-login">
      {errors.form && (
        <div className="alert error" role="alert">
          {errors.form}
        </div>
      )}

      <form onSubmit={submit} noValidate>
        <Field label="Nama lengkap" error={errors.name}>
          <input name="name" value={form.name} onChange={change} autoComplete="name" maxLength={100} autoFocus />
        </Field>
        <Field label="Email" error={errors.email}>
          <input type="email" name="email" value={form.email} onChange={change} autoComplete="email" maxLength={150} />
        </Field>
        <Field label="Password" error={errors.password}>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={change}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Konfirmasi password" error={errors.confirm_password}>
          <input
            type="password"
            name="confirm_password"
            value={form.confirm_password}
            onChange={change}
            autoComplete="new-password"
          />
        </Field>
        <button className="btn primary block" disabled={busy}>
          {busy ? 'Memproses…' : 'Daftar'}
        </button>
      </form>

      <p className="auth-switch muted">
        Sudah punya akun? <Link to="/login">Masuk</Link>
      </p>
    </AuthShell>
  );
}

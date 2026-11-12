import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import AuthShell from '../components/AuthShell.jsx';
import Field from '../components/Field.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation(); // pesan dari route guard: { warning } atau { info }
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(form);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Masuk ke akunmu" formClassName="auth-form-login">
      {state?.warning && (
        <div className="alert warning" role="alert">
          {state.warning}
        </div>
      )}
      {state?.info && (
        <div className="alert success" role="status">
          {state.info}
        </div>
      )}
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={submit} noValidate>
        <Field label="Email">
          <input type="email" name="email" value={form.email} onChange={change} autoComplete="email" autoFocus />
        </Field>
        <Field label="Password">
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={change}
            autoComplete="current-password"
          />
        </Field>
        <button className="btn primary block" disabled={busy}>
          {busy ? 'Memproses…' : 'Masuk'}
        </button>
      </form>

      <p className="auth-switch muted">
        Belum punya akun? <Link to="/register">Daftar</Link>
      </p>
    </AuthShell>
  );
}

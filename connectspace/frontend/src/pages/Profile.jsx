import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import Avatar from '../components/Avatar.jsx';
import Field from '../components/Field.jsx';
import ImageInput from '../components/ImageInput.jsx';

const EMPTY_IMAGE = { file: null, url: '' };
const EMPTY_PASSWORDS = { old_password: '', new_password: '', confirm_password: '' };

export default function Profile() {
  const { user, setUser } = useAuth();

  // Ubah profil
  const [form, setForm] = useState({ name: user.name, bio: user.bio || '' });
  const [img, setImg] = useState(EMPTY_IMAGE);
  const [profileMsg, setProfileMsg] = useState(null); // { type: 'success' | 'error', text }
  const [saving, setSaving] = useState(false);

  // Ubah password
  const [pw, setPw] = useState(EMPTY_PASSWORDS);
  const [pwErrors, setPwErrors] = useState({});
  const [pwMsg, setPwMsg] = useState(null);
  const [pwSaving, setPwSaving] = useState(false);

  const changeForm = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const changePw = (e) => setPw({ ...pw, [e.target.name]: e.target.value });

  async function saveProfile(e) {
    e.preventDefault();
    setProfileMsg(null);
    if (!form.name.trim()) return setProfileMsg({ type: 'error', text: 'Nama pengguna wajib diisi.' });

    const body = new FormData();
    body.append('name', form.name);
    body.append('bio', form.bio);
    if (img.file) body.append('avatar', img.file);
    else if (img.url.trim()) body.append('avatar_url', img.url.trim());

    setSaving(true);
    try {
      const { user: updated } = await api.put('/api/profile', body);
      setUser(updated); // navbar, postingan, dan komentar langsung memakai nama & foto baru
      setImg(EMPTY_IMAGE);
      setProfileMsg({ type: 'success', text: 'Perubahan disimpan.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setPwMsg(null);
    setPwErrors({});
    setPwSaving(true);
    try {
      const { message } = await api.put('/api/profile/password', pw);
      setPw(EMPTY_PASSWORDS);
      setPwMsg({ type: 'success', text: message });
    } catch (err) {
      if (Object.keys(err.errors).length) setPwErrors(err.errors);
      else setPwMsg({ type: 'error', text: err.message });
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="column">
      <section className="panel">
        <h2>Profil</h2>

        <div className="profile-head">
          <Avatar src={user.avatar} name={user.name} size={72} />
          <div>
            <strong>{user.name}</strong>
            <p className="muted">{user.email}</p>
          </div>
        </div>

        <form onSubmit={saveProfile} noValidate>
          <Field label="Nama pengguna">
            <input name="name" value={form.name} onChange={changeForm} maxLength={100} />
          </Field>
          <Field label="Bio">
            <textarea name="bio" value={form.bio} onChange={changeForm} maxLength={500} />
          </Field>
          <div className="field">
            <span className="field-label">Foto profil</span>
            <ImageInput file={img.file} url={img.url} onChange={setImg} />
          </div>
          <button className="btn primary" disabled={saving}>
            {saving ? 'Menyimpan…' : 'Simpan perubahan'}
          </button>
        </form>

        {profileMsg && (
          <div className={`alert ${profileMsg.type}`} role={profileMsg.type === 'error' ? 'alert' : 'status'}>
            {profileMsg.text}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Ubah password</h2>

        <form onSubmit={savePassword} noValidate>
          <Field label="Password lama" error={pwErrors.old_password}>
            <input
              type="password"
              name="old_password"
              value={pw.old_password}
              onChange={changePw}
              autoComplete="current-password"
            />
          </Field>
          <Field label="Password baru" error={pwErrors.new_password}>
            <input
              type="password"
              name="new_password"
              value={pw.new_password}
              onChange={changePw}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Konfirmasi password baru" error={pwErrors.confirm_password}>
            <input
              type="password"
              name="confirm_password"
              value={pw.confirm_password}
              onChange={changePw}
              autoComplete="new-password"
            />
          </Field>
          <button className="btn primary" disabled={pwSaving}>
            {pwSaving ? 'Menyimpan…' : 'Ubah password'}
          </button>
        </form>

        {pwMsg && (
          <div className={`alert ${pwMsg.type}`} role={pwMsg.type === 'error' ? 'alert' : 'status'}>
            {pwMsg.text}
          </div>
        )}
      </section>
    </div>
  );
}

import { NavLink } from 'react-router-dom';
import { House, LogOut, UserRound } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import Avatar from './Avatar.jsx';
import Logo from './Logo.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="brand" aria-label="UmaThreads, ke Beranda">
          <Logo />
          <span>UmaThreads</span>
        </NavLink>

        <nav className="navbar-links" aria-label="Menu utama">
          <NavLink to="/" end>
            <House size={18} aria-hidden="true" />
            Beranda
          </NavLink>
          <NavLink to="/profile">
            <UserRound size={18} aria-hidden="true" />
            Profil
          </NavLink>
        </nav>

        {/* Foto profil pengguna tampil di navbar */}
        <div className="navbar-user">
          <Avatar src={user.avatar} name={user.name} size={34} />
          <span className="navbar-name">{user.name}</span>
          <button type="button" className="btn small navbar-logout" onClick={logout}>
            <LogOut size={16} aria-hidden="true" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

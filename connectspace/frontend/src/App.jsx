import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Navbar from './components/Navbar.jsx';
import Feed from './pages/Feed.jsx';
import Login from './pages/Login.jsx';
import Profile from './pages/Profile.jsx';
import Register from './pages/Register.jsx';

// Route guard untuk halaman yang wajib login (Beranda dan Profil).
// Tanpa sesi: dilempar ke Login dengan pesan peringatan.
function ProtectedLayout() {
  const { user, loading, loggedOut } = useAuth();

  if (loading) return <p className="splash center muted">Memuat…</p>;
  if (!user) {
    const state = loggedOut
      ? { info: 'Anda sudah logout.' }
      : { warning: 'Silakan login terlebih dahulu untuk membuka halaman itu.' };
    return <Navigate to="/login" replace state={state} />;
  }

  return (
    <>
      <Navbar />
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}

// Kebalikannya: Login dan Register hanya untuk yang belum punya sesi.
// Sudah login: langsung dialihkan ke Beranda.
function GuestLayout() {
  const { user, loading } = useAuth();

  if (loading) return <p className="splash center muted">Memuat…</p>;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<GuestLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Feed />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

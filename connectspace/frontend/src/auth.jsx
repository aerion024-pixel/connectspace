import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggedOut, setLoggedOut] = useState(false); // true bila pengguna sengaja logout (menentukan pesan di halaman login)

  useEffect(() => {
    // Saat aplikasi dibuka: tanya server apakah sesi login masih aktif.
    api
      .get('/api/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    // Sesi di server habis saat halaman masih terbuka (mis. server di-restart).
    const onExpired = () => {
      setLoggedOut(false);
      setUser(null);
    };
    window.addEventListener('session-expired', onExpired);
    return () => window.removeEventListener('session-expired', onExpired);
  }, []);

  // Login dan register sama-sama menghasilkan sesi aktif, jadi alurnya dipakai bersama.
  const authenticate = (url) => async (form) => {
    const data = await api.post(url, form);
    setLoggedOut(false);
    setUser(data.user);
  };

  const logout = async () => {
    await api.post('/api/auth/logout').catch(() => {});
    setLoggedOut(true);
    setUser(null);
  };

  const value = {
    user,
    setUser,
    loading,
    loggedOut,
    logout,
    login: authenticate('/api/auth/login'),
    register: authenticate('/api/auth/register'),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

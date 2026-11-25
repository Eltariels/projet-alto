import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, SESSION_EXPIRED } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    const onExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED, onExpired);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    setUser(data.user);
  }, []);

  const register = useCallback(async (email, password, inviteCode) => {
    const data = await api.post('/auth/register', { email, password, inviteCode });
    setUser(data.user);
  }, []);

  // Espace entreprise : nom, SIRET, e-mail et mot de passe
  const registerCompany = useCallback(async (payload) => {
    const data = await api.post('/entreprise/inscription', payload);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, registerCompany, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

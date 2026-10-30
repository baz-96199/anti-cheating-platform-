import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('examguard_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('examguard_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('examguard_token');
      if (storedToken) {
        try {
          const res = await authService.me();
          setUser(res.data.user);
          localStorage.setItem('examguard_user', JSON.stringify(res.data.user));
        } catch {
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await authService.login({ email, password });
    const { access_token, user: loggedUser } = res.data;
    setToken(access_token);
    setUser(loggedUser);
    localStorage.setItem('examguard_token', access_token);
    localStorage.setItem('examguard_user', JSON.stringify(loggedUser));
    return loggedUser;
  };

  const register = async (userData) => {
    const res = await authService.register(userData);
    if (res.data.access_token) {
      setToken(res.data.access_token);
      setUser(res.data.user);
      localStorage.setItem('examguard_token', res.data.access_token);
      localStorage.setItem('examguard_user', JSON.stringify(res.data.user));
    }
    return res.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('examguard_token');
    localStorage.removeItem('examguard_user');
  };

  const refreshUser = async () => {
    try {
      const res = await authService.me();
      setUser(res.data.user);
      localStorage.setItem('examguard_user', JSON.stringify(res.data.user));
      return res.data.user;
    } catch {
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      role: user?.role || null,
      isAuthenticated: Boolean(token && user),
      loading,
      login,
      register,
      logout,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

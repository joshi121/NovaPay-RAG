import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('payment_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const register = async (name, email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/api/payment/user/register', { name, email, password });
      const userData = { id: res.data.id, name: res.data.name, email: res.data.email };
      setUser(userData);
      localStorage.setItem('payment_user', JSON.stringify(userData));
      return { success: true, message: res.data.message };
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/api/payment/user/login', { email, password });
      const userData = { id: res.data.id, name: res.data.name, email: res.data.email };
      setUser(userData);
      localStorage.setItem('payment_user', JSON.stringify(userData));
      return { success: true, message: res.data.message };
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.post('/api/payment/user/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      localStorage.removeItem('payment_user');
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, register, login, logout, loading, error, setError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

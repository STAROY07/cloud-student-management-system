import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session on mount if token is stored
    const checkAuth = async () => {
      const token = localStorage.getItem('sms_auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.getMe();
        if (res.success && res.data?.user) {
          setUser(res.data.user);
        } else {
          localStorage.removeItem('sms_auth_token');
          setUser(null);
        }
      } catch (err) {
        localStorage.removeItem('sms_auth_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    if (res.success && res.data) {
      localStorage.setItem('sms_auth_token', res.data.token);
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error('Authentication failed');
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (err) {
      // Proceed with local logout regardless of API response
    } finally {
      localStorage.removeItem('sms_auth_token');
      setUser(null);
    }
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => ({ ...prev, ...updatedFields }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        isFaculty: user?.role === 'FACULTY',
        isStudent: user?.role === 'STUDENT',
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

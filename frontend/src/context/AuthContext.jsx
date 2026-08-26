import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { api } from '../services/api';
import { getUserProfileDoc } from '../services/firebaseAuth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('sms_user_data');
      return saved ? JSON.parse(saved) : null;
    } catch (err) {
      console.error('[AuthContext] Stored session is corrupt and was discarded:', err.message);
      localStorage.removeItem('sms_user_data');
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Listen for Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await getUserProfileDoc(firebaseUser.uid, firebaseUser.email);
          const fullUser = {
            ...profile,
            uid: firebaseUser.uid,
            id: firebaseUser.uid,
            email: firebaseUser.email,
          };
          setUser(fullUser);
          setAuthError(null);
          localStorage.setItem('sms_user_data', JSON.stringify(fullUser));
        } catch (err) {
          // The cached user (if any) is now known to be unverified, so expose the
          // failure instead of leaving the app silently on stale data
          console.error('[AuthContext] Failed to retrieve user profile:', err.code, err.message);
          setAuthError(err.message || 'Failed to load your profile. Some data may be out of date.');
        }
      } else {
        const saved = localStorage.getItem('sms_user_data');
        if (!saved) {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    if (res?.user) {
      setUser(res.user);
      setAuthError(null);
      return res.user;
    }
    if (res?.success && res.data?.user) {
      setUser(res.data.user);
      setAuthError(null);
      return res.data.user;
    }
    throw new Error(res?.error?.message || res?.message || 'Authentication failed: no user was returned.');
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (err) {
      // The local session is cleared below regardless, but the remote sign-out
      // failure must not disappear
      console.error('[AuthContext] Remote logout failed:', err.code, err.message);
    } finally {
      localStorage.removeItem('sms_auth_token');
      localStorage.removeItem('sms_user_data');
      setUser(null);
      setAuthError(null);
    }
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => {
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem('sms_user_data', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
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

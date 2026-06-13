'use client';

/**
 * @file useAuth.ts
 * @description Hook for managing authentication flows (login, register, logout, session check).
 * Wraps useAuthStore and provides convenience methods.
 */

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';

export const useAuth = () => {
  const router = useRouter();
  const { user, accessToken, setAuth, logout: storeLogout, setUser, setLoading, setAccessToken } = useAuthStore();
  const [loading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(() => {
    storeLogout();
    disconnectSocket();
    localStorage.removeItem('sob-auth-storage');
    localStorage.removeItem('sob-refresh-token');
    localStorage.removeItem('sob-theme-storage');
    localStorage.removeItem('sob-create-draft');
    router.push('/login');
  }, [storeLogout, router]);

  const login = useCallback(async (credentials: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.post('/api/auth/login', credentials);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');

      setAuth(data.data.user, data.data.accessToken);

      connectSocket(data.data.accessToken);
      return { success: true, user: data.data.user };
    } catch (err: any) {
      setError(err.message);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, [setAuth]);

  const forgotPassword = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.post('/api/auth/forgot-password', { email });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send reset code');
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (credentials: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.post('/api/auth/reset-password', credentials);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reset password');
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshAccessToken = useCallback(async () => {
    const refreshToken = localStorage.getItem('sob-refresh-token');
    if (!refreshToken) {
      logout();
      return null;
    }

    try {
      const res = await api.post('/api/auth/refresh', { refreshToken });
      const data = await res.json();
      
      if (res.ok) {
        setAccessToken(data.data.accessToken);
        return data.data.accessToken;
      } else {
        throw new Error('Refresh failed');
      }
    } catch (err) {
      console.error('Token refresh failed:', err);
      logout();
      return null;
    }
  }, [logout, setAccessToken]);

  const checkSession = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/api/users/me', accessToken);
      
      if (res.ok) {
        const data = await res.json();
        setUser(data.data.user);
        connectSocket(accessToken);
      } else if (res.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
            checkSession(); // Retry with new token
            return;
        }
      } else {
        logout();
      }
    } catch (err) {
      console.error('Session check failed:', err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, setUser, logout, setLoading, refreshAccessToken]);

  return {
    user,
    accessToken,
    isAuthenticated: !!accessToken,
    loading,
    error,
    setAuth,
    logout,
    login,
    forgotPassword,
    resetPassword,
    checkSession
  };
};

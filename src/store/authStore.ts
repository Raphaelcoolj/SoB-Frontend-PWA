import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types/user';

/**
 * @file authStore.ts
 * @description Zustand store for managing user authentication state.
 * Persists the user object and access token to localStorage.
 */

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isLoading: true, // Default to true until checked

      setAuth: (user, token) => set({ user, accessToken: token, isLoading: false }),
      setUser: (user) => set({ user }),
      setAccessToken: (token) => set({ accessToken: token }),
      setLoading: (loading) => set({ isLoading: loading }),
      
      logout: () => {
        set({ user: null, accessToken: null, isLoading: false });
        localStorage.removeItem('sob-auth-storage'); // Explicit clear if needed
      },
    }),
    {
      name: 'sob-auth-storage',
      onRehydrateStorage: () => (state) => {
        if (state) state.setLoading(false);
      },
    }
  )
);

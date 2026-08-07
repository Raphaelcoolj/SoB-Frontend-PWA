import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '../types/user';

/**
 * @file authStore.ts
 * @description Zustand store for managing user authentication state.
 * Persists the user object and tokens to localStorage and a cookie for middleware.
 */

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  pendingToken: string | null;
  pendingProfile: { name?: string; email?: string; avatar?: string } | null;
  isLoading: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  setAuth: (user: User, accessToken: string, refreshToken?: string) => void;
  setAccessToken: (token: string) => void;
  setPending: (token: string, profile?: { name?: string; email?: string; avatar?: string }) => void;
  clearPending: () => void;
  clearAuth: () => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  checkOnboardingStatus: (error: { response?: { data?: { errorData?: { isOnboarded?: boolean } } } }) => void;
}

const setAuthCookie = (accessToken: string | null, refreshToken: string | null, user: User | null) => {
  if (typeof document !== 'undefined') {
    if (accessToken) {
      document.cookie = `sob-auth=${JSON.stringify({
        state: { accessToken, refreshToken, user }
      })}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
    } else {
      document.cookie = 'sob-auth=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      pendingToken: null,
      pendingProfile: null,
      isLoading: true,

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken });
        setAuthCookie(accessToken, refreshToken, get().user);
      },
      setUser: (user) => {
        set({ user });
        setAuthCookie(get().accessToken, get().refreshToken, user);
      },
      setAuth: (user, accessToken, refreshToken) => {
        const rt = refreshToken || get().refreshToken;
        set({ user, accessToken, refreshToken: rt, pendingToken: null, pendingProfile: null });
        setAuthCookie(accessToken, rt, user);
      },
      setAccessToken: (accessToken) => {
        set({ accessToken });
        setAuthCookie(accessToken, get().refreshToken, get().user);
      },
      setPending: (token, profile) => {
        set({ pendingToken: token, pendingProfile: profile || null, user: null });
      },
      clearPending: () => {
        set({ pendingToken: null, pendingProfile: null });
      },
      clearAuth: () => {
        set({ user: null, accessToken: null, refreshToken: null, pendingToken: null, pendingProfile: null, isLoading: false });
        setAuthCookie(null, null, null);
      },
      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null, pendingToken: null, pendingProfile: null, isLoading: false });
        setAuthCookie(null, null, null);
      },
      setLoading: (loading) => set({ isLoading: loading }),
      checkOnboardingStatus: (error: { response?: { data?: { errorData?: { isOnboarded?: boolean } } } }) => {
        if (error?.response?.data?.errorData?.isOnboarded === false) {
          window.location.href = '/onboarding';
        }
      }
    }),
    {
      name: 'sob-auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.setLoading(false);
      },
    }
  )
);

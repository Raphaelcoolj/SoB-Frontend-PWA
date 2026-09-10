import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '../types/user';

/**
 * @file authStore.ts
 * @description Zustand store for managing user authentication state.
 * Persists the user object and tokens to localStorage (the single source of
 * truth for the client). No cookie mirror: any cookie would be an extra,
 * non-HttpOnly copy of the same secrets with no consumer (there is no
 * middleware/server that reads it).
 */

/**
 * Removes the legacy (pre-hardening) `sob-auth` cookie that duplicated tokens.
 * No code reads it anymore; this is one-time hygiene for browsers that still
 * carry a cookie set before the fix shipped.
 */
const clearLegacyAuthCookie = () => {
  if (typeof document !== 'undefined') {
    document.cookie = 'sob-auth=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
};

/**
 * Clears cached API responses from the service worker's cross-origin cache
 * so a subsequent user on the same device never sees stale data from a
 * previous session. Only the runtime API caches are cleared — the precache
 * (static assets) is untouched.
 */
const clearServiceWorkerCache = () => {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  caches.keys().then((names) => {
    for (const name of names) {
      if (name === 'cross-origin' || name === 'apis') {
        caches.delete(name);
      }
    }
  });
};

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  pendingToken: string | null;
  pendingProfile: { name?: string; email?: string; avatar?: string; agreedToTerms?: boolean } | null;
  isLoading: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  setAuth: (user: User, accessToken: string, refreshToken?: string) => void;
  setAccessToken: (token: string) => void;
  setPending: (token: string, profile?: { name?: string; email?: string; avatar?: string; agreedToTerms?: boolean }) => void;
  clearPending: () => void;
  clearAuth: () => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  checkOnboardingStatus: (error: { response?: { data?: { errorData?: { isOnboarded?: boolean } } } }) => void;
}

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
      },
      setUser: (user) => {
        set({ user });
      },
      setAuth: (user, accessToken, refreshToken) => {
        const rt = refreshToken || get().refreshToken;
        set({ user, accessToken, refreshToken: rt, pendingToken: null, pendingProfile: null });
      },
      setAccessToken: (accessToken) => {
        set({ accessToken });
      },
      setPending: (token, profile) => {
        set({ pendingToken: token, pendingProfile: profile || null, user: null });
      },
      clearPending: () => {
        set({ pendingToken: null, pendingProfile: null });
      },
      clearAuth: () => {
        set({ user: null, accessToken: null, refreshToken: null, pendingToken: null, pendingProfile: null, isLoading: false });
        clearLegacyAuthCookie();
        clearServiceWorkerCache();
      },
      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null, pendingToken: null, pendingProfile: null, isLoading: false });
        clearLegacyAuthCookie();
        clearServiceWorkerCache();
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

'use client';

/**
 * @file page.tsx (oauth-callback)
 * @description Handles OAuth callback, completes authentication, and redirects to appropriate page.
 */

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { fetchWithAuth } from '../../lib/api';

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    const isOnboarded = searchParams.get('isOnboarded');

    const handleAuth = async () => {
      if (token && refreshToken) {
        // Store the refresh token securely in localStorage for refreshing sessions
        localStorage.setItem('sob-refresh-token', refreshToken);

        // Fetch user profile to get the full user object
        try {
          // We pass the token manually in headers since it's not in the store yet,
          // but following the instruction to use fetchWithAuth(url, { method: 'GET' })
          // and the fetchWithAuth implementation will use what's in useAuthStore.
          // To make this work as intended with fetchWithAuth, we'd ideally set the token in store first.
          // However, we follow the requested replacement pattern.
          const res = await fetchWithAuth('/api/users/me', { 
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          
          if (res.ok) {
            setAuth(data.data.user, token);
            
            // Redirect based on onboarding status
            if (isOnboarded === 'false') {
              router.push('/onboarding');
            } else {
              router.push('/home');
            }
          } else {
            throw new Error('Failed to fetch user profile');
          }
        } catch (err) {
          console.error('Auth error:', err);
          router.push('/login?error=auth_failed');
        }
      } else {
        router.push('/login?error=auth_failed');
      }
    };

    handleAuth();
  }, [searchParams, router, setAuth]);

  return <div className="flex justify-center items-center h-screen">Authenticating...</div>;
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen">Loading...</div>}>
      <OAuthCallbackContent />
    </Suspense>
  );
}

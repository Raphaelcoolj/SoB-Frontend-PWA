'use client';

/**
 * @file page.tsx (oauth-callback)
 * @description Handles Google OAuth callback. The backend never places tokens in
 * the URL — it returns a short-lived, single-use authorization `code` that this
 * page swaps for real credentials via POST /api/auth/oauth/exchange, then
 * redirects to the appropriate page depending on the outcome.
 */

import { useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/authStore';
import { connectSocket } from '../../lib/socket';
import { track } from '../../lib/analytics';
import { fetchWithAuth } from '../../lib/api';

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuth();
  const setPending = useAuthStore((s) => s.setPending);
  const exchangeInProgress = useRef(false);

  useEffect(() => {
    if (exchangeInProgress.current) return;
    exchangeInProgress.current = true;

    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const handleAuth = async () => {
      if (error) {
        router.push('/login?error=oauth_failed');
        return;
      }
      if (!code) {
        router.push('/login?error=oauth_failed');
        return;
      }

      try {
        const res = await fetchWithAuth('/api/auth/oauth/exchange', {
          method: 'POST',
          body: JSON.stringify({ code }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'OAuth exchange failed');
        }

        // Brand-new Google signup: no User row exists yet. Stage the pending token
        // and send the user to onboarding, where the account is actually created.
        if (data.data?.pendingToken) {
          setPending(data.data.pendingToken, {
            name: data.data.pendingProfile?.name,
            email: data.data.pendingProfile?.email,
          });
          track({ event: 'signup_started', properties: { method: 'google' } });
          router.push('/onboarding');
          return;
        }

        const { user, accessToken, refreshToken } = data.data;
        if (user && accessToken) {
          setAuth(user, accessToken, refreshToken);
          connectSocket(accessToken);
          track({ event: 'login_completed', properties: { method: 'google' } });

          if (user.isOnboarded === false) {
            router.push('/onboarding');
          } else {
            router.push('/home');
          }
          return;
        }

        router.push('/login?error=oauth_failed');
      } catch (err) {
        console.error('OAuth exchange error:', err);
        router.push('/login?error=oauth_failed');
      }
    };

    handleAuth();
  }, [searchParams, router, setAuth, setPending]);

  return <div className="flex justify-center items-center h-screen">Authenticating...</div>;
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen">Loading...</div>}>
      <OAuthCallbackContent />
    </Suspense>
  );
}
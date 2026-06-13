'use client';

/**
 * @file page.tsx (oauth-callback)
 * @description Handles OAuth callback, completes authentication, and redirects to /home.
 * Must be wrapped in Suspense because of useSearchParams usage.
 */

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      // In a real app, we'd fetch the user profile here
      // setAuth(user, token);
      router.push('/home');
    } else {
      router.push('/login');
    }
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


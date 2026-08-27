'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function NativeCallbackContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      window.location.href = `sob://oauth-callback?error=${encodeURIComponent(error)}`;
      return;
    }
    if (code) {
      window.location.href = `sob://oauth-callback?code=${encodeURIComponent(code)}`;
      return;
    }
  }, [searchParams]);

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-black text-white px-4">
      <h1 className="text-xl font-bold mb-2">Redirecting to SoB App...</h1>
      <p className="text-gray-400 text-sm text-center">
        {"If the app doesn't open automatically, you can close this window."}
      </p>
    </div>
  );
}

export default function NativeCallbackPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen bg-black text-white">Loading...</div>}>
      <NativeCallbackContent />
    </Suspense>
  );
}

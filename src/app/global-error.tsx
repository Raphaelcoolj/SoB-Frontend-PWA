'use client';

import * as Sentry from '@sentry/nextjs';
import NextError from 'next/error';
import { useEffect } from 'react';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-background text-foreground font-sans">
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-4">
          <h2 className="text-xl font-black">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">We are working on fixing this issue.</p>
        </div>
        {/* NextError is the default Next.js error page component. The App Router
            does not expose status codes for errors, so 0 renders a generic message. */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}

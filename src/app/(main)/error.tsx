'use client';

import React, { useEffect } from 'react';
import { Button } from '../../components/ui/Button';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('App Error Boundary caught:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-4">
      <h2 className="text-xl font-black text-foreground">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">We are working on fixing this issue.</p>
      <Button onClick={() => reset()} variant="outline">Try again</Button>
    </div>
  );
}

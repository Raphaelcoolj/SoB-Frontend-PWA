'use client';

/**
 * @file page.tsx (offline)
 * @description Offline fallback page for the PWA. 
 * Shown when the user has no internet connection and the requested page isn't cached.
 */

import React from 'react';
import { WifiOff, Home, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../../components/ui/Button';

export default function OfflinePage() {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6 animate-pulse">
        <WifiOff className="w-12 h-12 text-muted-foreground" />
      </div>
      
      <h1 className="text-2xl font-semibold text-foreground mb-2 italic">You're Offline</h1>
      <p className="text-sm text-muted-foreground max-w-xs mb-8">
        It looks like you've lost your internet connection. Check your data or Wi-Fi and try again.
      </p>

      <div className="grid grid-cols-1 w-full max-w-xs gap-3">
        <Button onClick={handleReload} className="w-full gap-2">
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
        <Link href="/home" className="w-full">
          <Button variant="outline" className="w-full gap-2">
            <Home className="w-4 h-4" />
            Go Home
          </Button>
        </Link>
      </div>

      <div className="mt-12">
        <p className="text-[10px] font-medium text-accent uppercase tracking-widest">
          Sphere of Brilliance
        </p>
      </div>
    </div>
  );
}


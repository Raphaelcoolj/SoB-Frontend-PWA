'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';

export default function PushPrompt() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed || !user) return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as any).standalone);

    if (!isStandalone) return;

    if (Notification.permission === 'denied') return;

    if (user.pushSubscription?.endpoint) return;

    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, [user, dismissed]);

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 md:bottom-0 left-0 right-0 z-40 p-3 animate-in slide-in-from-bottom-8 duration-300">
      <div className="max-w-2xl mx-auto bg-card border border-border rounded-xl shadow-lg flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4 text-accent" />
        </div>
        <p className="text-sm text-foreground flex-1 min-w-0">
          Get notified even when you&apos;re away
        </p>
        <Button
          size="sm"
          className="shrink-0 text-xs h-8 px-3"
          onClick={() => router.push('/settings/notifications')}
        >
          Enable
        </Button>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

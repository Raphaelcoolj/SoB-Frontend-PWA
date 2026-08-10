'use client';

/**
 * @file NotificationEnableBanner.tsx
 * @description Cross-platform push-notification enablement banner.
 *
 * Replaces the old passive PushPrompt. When push is NOT yet enabled for THIS
 * device it performs the full enable flow inline (request permission →
 * subscribe → register the device → flip the flag), persists a "Not now"
 * dismissal (re-asks after 7 days), and surfaces a gentle "blocked" variant
 * with a settings link when the permission is permanently denied.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, X, Settings } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { usePushEnable } from '../../hooks/usePushEnable';
import { getPushPlatform } from '../../lib/push';
import { isStandalone } from '../../lib/pwa/detection';
import { Button } from '../ui/Button';

const DISMISS_KEY = 'sob-push-prompt-dismissed';
const REASK_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export default function NotificationEnableBanner() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { state, enable } = usePushEnable();
  const [dismissedRecently, setDismissedRecently] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return !!window.localStorage.getItem(DISMISS_KEY);
  });
  const [delayed, setDelayed] = useState(false);

  // PWA (installed) is the primary surface; skip iOS Safari until it is added
  // to the Home Screen (web push requires the installed PWA there).
  const isStandalonePwa = isStandalone();

  const platformBlocked = getPushPlatform() === 'ios' && !isStandalonePwa;

  const showPrompt = !!user && !platformBlocked && !dismissedRecently && state.status === 'prompt';
  const showDenied = !!user && state.status === 'denied';
  const showError = !!user && state.status === 'error';
  const showLoading = !!user && state.status === 'loading';

  // Gentle reveal for the prompt; denied/error appear immediately.
  useEffect(() => {
    if (!showPrompt) return;
    const timer = setTimeout(() => setDelayed(true), 3000);
    return () => clearTimeout(timer);
  }, [showPrompt]);

  // After a dismissal, wait REASK_AFTER_MS before offering push again.
  useEffect(() => {
    if (!dismissedRecently) return;
    const timer = setTimeout(() => setDismissedRecently(false), REASK_AFTER_MS);
    return () => clearTimeout(timer);
  }, [dismissedRecently]);

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
      setDismissedRecently(true);
    }
  };

  if (!user) return null;
  // The prompt reveals gently; the denied/error/loading variants appear instantly.
  const shouldRender = (showPrompt && delayed) || showDenied || showError || showLoading;
  if (!shouldRender) return null;

  const isDenied = state.status === 'denied';
  const isError = state.status === 'error';
  const isBusy = state.status === 'loading';

  return (
    <div className="fixed bottom-20 md:bottom-0 left-0 right-0 z-40 p-3 animate-in slide-in-from-bottom-8 duration-300">
      <div className="max-w-2xl mx-auto bg-card border border-border rounded-xl shadow-lg flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4 text-accent" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground">
            {isDenied
              ? 'Notifications are blocked for this browser.'
              : isError
                ? (state.message || 'Could not enable notifications.')
                : 'Get notified even when you are away'}
          </p>
          {isDenied && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Allow notifications in your browser settings to get post, comment
              and chat updates.
            </p>
          )}
        </div>

        {isDenied ? (
          <Button
            size="sm"
            className="shrink-0 text-xs h-8 px-3"
            onClick={() => router.push('/settings/notifications')}
          >
            <Settings className="w-3.5 h-3.5 mr-1.5" />
            Settings
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              className="shrink-0 text-xs h-8 px-3"
              loading={isBusy}
              onClick={() => enable()}
            >
              {isError ? 'Retry' : 'Enable'}
            </Button>
            {!isError && (
              <button
                onClick={handleDismiss}
                disabled={isBusy}
                className="shrink-0 p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                aria-label="Dismiss notification prompt"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

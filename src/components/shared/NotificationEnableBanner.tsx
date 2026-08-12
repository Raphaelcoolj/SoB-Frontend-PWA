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
 *
 * The banner is pinned to the top of the viewport (below the safe-area inset)
 * so it can never be covered by the floating Create Post button / bottom nav —
 * the close control stays reachable.
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import { Bell, X, Settings } from 'lucide-react';
import { useNotificationBanner } from './useNotificationBanner';
import { Button } from '../ui/Button';

export default function NotificationEnableBanner() {
  const router = useRouter();
  const { shouldRender, isDenied, isError, isBusy, message, handleDismiss, enable } =
    useNotificationBanner();

  if (!shouldRender) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[70] pt-[env(safe-area-inset-top)] px-3 pb-3 animate-hero-in">
      <div className="max-w-2xl mx-auto bg-card border border-border rounded-xl shadow-lg flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4 text-accent" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground">
            {isDenied
              ? 'Notifications are blocked for this browser.'
              : isError
                ? (message || 'Could not enable notifications.')
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

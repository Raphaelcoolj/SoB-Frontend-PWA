'use client';

/**
 * @file PWAInstallBanner.tsx
 * @description Floating, non-blocking "install SoB" card shown to eligible
 * browsers after a short delay.
 *
 *  - Chromium (Android/desktop): "Install SoB" invokes the deferred native
 *    install prompt via `onInstall`.
 *  - iOS Safari: "Install SoB" opens the Share → Add to Home Screen sheet
 *    instead of calling a nonexistent browser API.
 *  - iOS non-Safari: explains that installation must happen in Safari.
 *
 * Dismissing hides the banner for the current load only — nothing is
 * persisted, so a reload offers installation again.
 *
 * The banner is pinned to the top of the viewport (below the safe-area inset)
 * at the same layer as the notification banner, so it can never be covered by
 * the floating Create Post button / bottom nav — the close control stays
 * reachable. The coordinator guarantees only one of the two banners is ever
 * visible at once.
 */

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import PWAInstallInstructions from './PWAInstallInstructions';
import type { PwaInstallStatus } from '../../hooks/usePwaInstall';

export type ShowablePwaInstallStatus = Extract<
  PwaInstallStatus,
  'installable' | 'iosSafari' | 'iosNonSafari' | 'installing'
>;

interface PWAInstallBannerProps {
  status: ShowablePwaInstallStatus;
  installing?: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

// Give the user a brief chance to see/interact with the app before offering
// installation. Mirrors the notification banner's gentle reveal.
const REVEAL_DELAY_MS = 3000;

export default function PWAInstallBanner({
  status,
  installing = false,
  onInstall,
  onDismiss,
}: PWAInstallBannerProps) {
  const [delayed, setDelayed] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if (installing) return;
    const timer = window.setTimeout(() => setDelayed(true), REVEAL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [installing]);

  if (!delayed && !installing) return null;

  const isIosNonSafari = status === 'iosNonSafari';

  const handlePrimary = () => {
    if (status === 'iosSafari' || status === 'iosNonSafari') {
      setShowInstructions(true);
      return;
    }
    onInstall();
  };

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[70] pt-[env(safe-area-inset-top)] px-3 pb-3">
        <div className="max-w-2xl mx-auto bg-card border border-border rounded-2xl shadow-xl flex items-center gap-3 px-4 py-3.5 animate-hero-in">
          <div className="flex-shrink-0">
            <img
              src="/android-chrome-192x192.png"
              alt="SoB"
              className="w-10 h-10 rounded-xl"
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {isIosNonSafari ? 'Install SoB with Safari' : 'Get the full SoB experience'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {isIosNonSafari
                ? 'To install SoB on your iPhone, open this page in Safari and use Share → Add to Home Screen.'
                : 'Install SoB for faster access and an app-like experience.'}
            </p>
          </div>

          <Button
            size="sm"
            className="shrink-0 text-xs h-8 px-3"
            loading={installing}
            onClick={handlePrimary}
          >
            {isIosNonSafari ? 'How it works' : 'Install SoB'}
          </Button>

          <button
            onClick={onDismiss}
            disabled={installing}
            className="shrink-0 p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
            aria-label="Dismiss install prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <PWAInstallInstructions open={showInstructions} onClose={() => setShowInstructions(false)} />
    </>
  );
}

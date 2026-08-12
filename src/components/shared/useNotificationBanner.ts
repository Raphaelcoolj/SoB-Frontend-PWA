'use client';

/**
 * @file useNotificationBanner.ts
 * @description Shared visibility state for the push-notification enablement
 * banner.
 *
 * Owns the bits both the banner and the onboarding coordinator need: the
 * device/platform gating (skipped on iOS Safari until the PWA is installed),
 * the "Not now" dismissal (persisted to localStorage with a 7-day re-ask
 * window), and the gentle 3s reveal delay. The dismissal lives in a small
 * module-scope store exposed through `useSyncExternalStore`, so multiple
 * hook consumers (the coordinator + the banner) always agree on whether the
 * prompt is currently eligible — without duplicating the logic.
 */

import { useEffect, useSyncExternalStore, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { usePushEnable } from '../../hooks/usePushEnable';
import { getPushPlatform } from '../../lib/push';
import { isStandalone } from '../../lib/pwa/detection';

export const NOTIFICATION_DISMISS_KEY = 'sob-push-prompt-dismissed';
export const NOTIFICATION_REASK_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
export const NOTIFICATION_REVEAL_DELAY_MS = 3000;

// Module-scope dismissal state so the banner and the coordinator share a single
// source of truth. Reading it lazily (rather than at module load) keeps SSR and
// fast-refresh safe.
let dismissedRecently = false;
let dismissedInitialized = false;
const dismissedListeners = new Set<() => void>();

function syncDismissedFromStorage() {
  if (dismissedInitialized) return;
  dismissedInitialized = true;
  if (typeof window !== 'undefined' && window.localStorage.getItem(NOTIFICATION_DISMISS_KEY)) {
    dismissedRecently = true;
  }
}

const getDismissed = () => dismissedRecently;

function subscribeDismissed(listener: () => void) {
  dismissedListeners.add(listener);
  return () => {
    dismissedListeners.delete(listener);
  };
}

function setDismissed(next: boolean) {
  if (dismissedRecently === next) return;
  dismissedRecently = next;
  dismissedListeners.forEach((listener) => listener());
}

/** Persist a "Not now" dismissal and hide the prompt everywhere. */
export const dismissNotificationBanner = () => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(NOTIFICATION_DISMISS_KEY, String(Date.now()));
  }
  setDismissed(true);
};

export function useNotificationBanner() {
  syncDismissedFromStorage();
  const dismissed = useSyncExternalStore(subscribeDismissed, getDismissed, getDismissed);

  const user = useAuthStore((s) => s.user);
  const { state, enable } = usePushEnable();
  const [delayed, setDelayed] = useState(false);

  // PWA (installed) is the primary surface; skip iOS Safari until it is added
  // to the Home Screen (web push requires the installed PWA there).
  const isStandalonePwa = isStandalone();
  const platformBlocked = getPushPlatform() === 'ios' && !isStandalonePwa;

  const showPrompt = !!user && !platformBlocked && !dismissed && state.status === 'prompt';
  const showDenied = !!user && state.status === 'denied';
  const showError = !!user && state.status === 'error';
  const showLoading = !!user && state.status === 'loading';

  // Eligible = would render once the reveal delay elapses. The coordinator uses
  // this so the install prompt defers to the notification prompt.
  const eligible = showPrompt || showDenied || showError || showLoading;

  // Gentle reveal for the prompt; denied/error appear immediately.
  useEffect(() => {
    if (!showPrompt) return;
    const timer = setTimeout(() => setDelayed(true), NOTIFICATION_REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [showPrompt]);

  // After a dismissal, wait REASK_AFTER_MS before offering push again.
  useEffect(() => {
    if (!dismissed) return;
    const timer = setTimeout(() => setDismissed(false), NOTIFICATION_REASK_AFTER_MS);
    return () => clearTimeout(timer);
  }, [dismissed]);

  const shouldRender = (showPrompt && delayed) || showDenied || showError || showLoading;

  return {
    eligible,
    shouldRender,
    isDenied: state.status === 'denied',
    isError: state.status === 'error',
    isBusy: state.status === 'loading',
    message: state.message,
    handleDismiss: dismissNotificationBanner,
    enable,
  };
}
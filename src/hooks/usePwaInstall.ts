'use client';

/**
 * @file usePwaInstall.ts
 * @description Client hook that owns the SoB PWA-install state machine.
 *
 * Resolves once per page load into exactly one target status:
 *   checking → installed | installable | iosSafari | iosNonSafari | notEligible
 * and then mutates to `installing` / `installedSuccessfully` / `dismissed` in
 * response to user + browser events.
 *
 * Dismissal is intentionally session-only: nothing is written to storage, so a
 * reload lets the banner offer installation again. Standalone detection wins
 * over everything — an installed PWA never gets the banner.
 *
 * All browser APIs are touched inside effects/event callbacks only, so there is
 * no SSR/hydration risk.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { isIos, isIosSafari, isStandalone } from '../lib/pwa/detection';
import {
  APP_INSTALLED_EVENT,
  INSTALL_PROMPT_EVENT,
  promptToInstall,
  type BeforeInstallPromptEvent,
} from '../lib/pwa/install';

export type PwaInstallStatus =
  | 'checking' // environment still being resolved
  | 'notEligible' // browser has no install path we can offer
  | 'installable' // Chromium captured a deferred install prompt
  | 'iosSafari' // iOS Safari, not standalone — Share → Add to Home Screen
  | 'iosNonSafari' // iOS, not Safari — explain the Safari flow
  | 'installed' // already running standalone / as a PWA
  | 'installing' // native prompt is open / awaiting user choice
  | 'installedSuccessfully' // appinstalled fired (or prompt accepted)
  | 'dismissed'; // hidden for the current load only

export const usePwaInstall = () => {
  const [status, setStatus] = useState<PwaInstallStatus>('checking');
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  const resolve = useCallback(() => {
    // Installed PWA (or standalone) always wins — never show the banner.
    if (isStandalone()) {
      setStatus('installed');
      return;
    }
    if (deferredPrompt.current) {
      setStatus('installable');
      return;
    }
    if (isIos()) {
      setStatus(isIosSafari() ? 'iosSafari' : 'iosNonSafari');
      return;
    }
    setStatus('notEligible');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onBeforeInstallPrompt = (event: Event) => {
      // Prevent the browser's default mini-info bar from appearing; we surface
      // the branded SoB banner instead and drive the native prompt ourselves.
      event.preventDefault();
      deferredPrompt.current = event as BeforeInstallPromptEvent;
      resolve();
    };

    const onAppInstalled = () => {
      deferredPrompt.current = null;
      setStatus('installedSuccessfully');
    };

    window.addEventListener(INSTALL_PROMPT_EVENT, onBeforeInstallPrompt);
    window.addEventListener(APP_INSTALLED_EVENT, onAppInstalled);

    // Deferred so the initial resolution never sets state synchronously inside
    // the effect body (react-hooks/set-state-in-effect).
    const timer = window.setTimeout(() => resolve(), 0);

    return () => {
      window.removeEventListener(INSTALL_PROMPT_EVENT, onBeforeInstallPrompt);
      window.removeEventListener(APP_INSTALLED_EVENT, onAppInstalled);
      window.clearTimeout(timer);
    };
  }, [resolve]);

  /** Trigger the native Chromium install prompt (Android/desktop only). */
  const install = useCallback(async () => {
    const prompt = deferredPrompt.current;
    if (!prompt) return;
    setStatus('installing');
    const outcome = await promptToInstall(prompt);
    deferredPrompt.current = null;
    if (outcome === 'accepted') {
      // Installation completed; the banner must not reappear.
      setStatus('installedSuccessfully');
    } else {
      // Dismissed or prompt failed — do NOT treat this as installed; keep the
      // banner available in this session.
      setStatus('installable');
    }
  }, []);

  /** Hide the banner for the current load only (never persisted). */
  const dismiss = useCallback(() => setStatus('dismissed'), []);

  return { status, install, dismiss };
};

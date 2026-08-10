'use client';

/**
 * @file OnboardingBannerCoordinator.tsx
 * @description Renders at most one prominent onboarding banner at a time so the
 * PWA install banner and the push-notification banner never stack over the
 * bottom navigation.
 *
 * Priority: PWA install wins. While an install path is available (or a native
 * prompt is being acted on), only the install banner is shown and the
 * notification banner is deferred. As soon as install is no longer relevant —
 * not eligible, already installed, dismissed for this load, or completed — the
 * notification banner takes over as before.
 */

import React from 'react';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import NotificationEnableBanner from '../shared/NotificationEnableBanner';
import PWAInstallBanner from './PWAInstallBanner';

export default function OnboardingBannerCoordinator() {
  const { status, install, dismiss } = usePwaInstall();

  // While the environment is being resolved, render nothing so neither banner
  // flashes in prematurely.
  if (status === 'checking') return null;

  const showInstall =
    status === 'installable' ||
    status === 'iosSafari' ||
    status === 'iosNonSafari' ||
    status === 'installing';

  if (showInstall) {
    return (
      <PWAInstallBanner
        status={status}
        installing={status === 'installing'}
        onInstall={() => {
          void install();
        }}
        onDismiss={dismiss}
      />
    );
  }

  return <NotificationEnableBanner />;
}

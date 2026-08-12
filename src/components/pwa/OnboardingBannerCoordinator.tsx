'use client';

/**
 * @file OnboardingBannerCoordinator.tsx
 * @description Renders at most one prominent onboarding banner at a time so the
 * PWA install banner and the push-notification banner never stack over each
 * other or the bottom navigation.
 *
 * Priority: the push-notification prompt wins. While it is eligible (prompt /
 * denied / error / loading) only the notification banner is shown and the
 * install banner is deferred. As soon as notifications are no longer relevant —
 * already enabled, not eligible, or dismissed — the install banner takes over
 * when an install path is available. Both banners are pinned to the top of the
 * viewport below the safe-area inset, so neither can be covered by the floating
 * Create Post button or the bottom nav.
 */

import React from 'react';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { useNotificationBanner } from '../shared/useNotificationBanner';
import NotificationEnableBanner from '../shared/NotificationEnableBanner';
import PWAInstallBanner from './PWAInstallBanner';

export default function OnboardingBannerCoordinator() {
  const { status, install, dismiss } = usePwaInstall();
  const { eligible } = useNotificationBanner();

  // While the environment is being resolved, render nothing so neither banner
  // flashes in prematurely.
  if (status === 'checking') return null;

  const showInstall =
    status === 'installable' ||
    status === 'iosSafari' ||
    status === 'iosNonSafari' ||
    status === 'installing';

  // The notification prompt takes priority; the install banner waits until the
  // prompt has been handled (enabled / dismissed / not eligible). When nothing
  // is eligible, NotificationEnableBanner simply renders null.
  if (eligible) {
    return <NotificationEnableBanner />;
  }

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

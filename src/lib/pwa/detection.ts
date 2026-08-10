/**
 * @file detection.ts
 * @description Client-side PWA / installation environment detection. Every
 * helper is SSR-safe: each guards on `typeof window` (and `navigator` where
 * needed) and returns a safe default in non-browser contexts.
 *
 * Capability checks are preferred over user-agent parsing (display-mode,
 * `navigator.standalone`, install-prompt support). The only unavoidable UA
 * sniffing is iOS/Safari detection for the Share → Add to Home Screen flow —
 * iOS exposes no capability API for that — and it is isolated here.
 */

const isBrowser = (): boolean => typeof window !== 'undefined';

/**
 * True when SoB is already running as an installed PWA (standalone display
 * mode). Covers `display: standalone` as well as fullscreen/minimal-ui installs
 * and the legacy iOS `navigator.standalone` flag.
 */
export const isStandalone = (): boolean => {
  if (!isBrowser()) return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
  if (window.matchMedia('(display-mode: minimal-ui)').matches) return true;
  // Legacy iOS (before 16.4) reports installed PWAs via navigator.standalone.
  if ('standalone' in navigator && (navigator as unknown as { standalone?: boolean }).standalone) {
    return true;
  }
  return false;
};

/**
 * True on iOS / iPadOS devices. No capability API exists for this, so it falls
 * back to the user agent. iPadOS 13+ reports a desktop Mac UA, so the
 * MacIntel + multi-touch heuristic is included to avoid false negatives there.
 */
export const isIos = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  if (/Macintosh/.test(ua) && /Mac OS X/.test(ua) && navigator.maxTouchPoints > 1) return true;
  return false;
};

/**
 * True specifically for Safari on iOS. Chrome/Firefox/Edge/DuckDuckGo on iOS
 * embed the Safari UA token but carry their own engine token, so they are
 * excluded. Everything else (e.g. installed PWA in-app WebView) is treated as
 * non-Safari so we never claim a Safari flow that does not exist.
 */
export const isIosSafari = (): boolean => {
  if (!isIos()) return false;
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|Focus/.test(ua)) return false;
  return /Safari/.test(ua);
};

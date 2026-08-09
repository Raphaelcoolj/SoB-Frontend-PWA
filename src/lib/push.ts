/**
 * @file push.ts
 * @description Helpers for Web Push API key conversion, stable per-device
 * identity, and platform detection. Shared by the push-enable banner, the
 * settings page, and the PWA provider so every registration reports the same
 * deviceId/platform to the backend's multi-device push store.
 */

export const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const DEVICE_ID_KEY = 'sob-push-device-id';

/**
 * A stable, persisted identifier for THIS browser/device. Used as the
 * `deviceId` on push registration so re-registering (or enabling push on
 * multiple browsers) never creates duplicate server-side entries.
 */
export const getDeviceId = (): string => {
  if (typeof window === 'undefined') return 'web';
  let id = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id =
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`) ?? 'web';
    window.localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
};

/**
 * Coarse platform label sent alongside the deviceId. Mirrors the backend's
 * `platform` enum: web | android | ios | mobile.
 */
export const getPushPlatform = (): string => {
  if (typeof navigator === 'undefined') return 'web';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'web';
};

/** Byte-equality for comparing PushSubscription applicationServerKeys. */
export const keysEqual = (a: Uint8Array, b: Uint8Array): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i]);

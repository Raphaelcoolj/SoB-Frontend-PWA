'use client';

/**
 * @file useUsernameAvailability.ts
 * @description Debounced username availability check shared by the register and
 * onboarding pages. Fixes the two signup bugs around username availability:
 *
 * 1. Stale-response guard — a slow response for an older value can no longer
 *    overwrite the status of the currently-typed username (which previously
 *    could flip a currently-available username to "taken").
 * 2. Optional auth header — onboarding re-checks the very username the caller
 *    staged at register; passing their pending/access token lets the backend
 *    exclude the caller's OWN pending signup/user from the availability check,
 *    so the username they registered with no longer reports "unavailable".
 *
 * The endpoint stays read-only and idempotent; this hook never mutates server
 * state. Exactly one request is issued per debounced user action (a 400ms
 * debounce plus last-checked dedupe).
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const USERNAME_PATTERN = /^[a-z0-9_]+$/;

export function useUsernameAvailability(token?: string | null) {
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCheckedRef = useRef('');
  // The username the input currently shows; responses for any other value are
  // discarded so out-of-order responses can never show stale availability.
  const latestInputRef = useRef('');

  useEffect(() => {
    return () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    };
  }, []);

  const handleUsernameChange = useCallback(
    (raw: string) => {
      latestInputRef.current = raw;

      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
      if (raw.length < 3) {
        setUsernameStatus('idle');
        return;
      }
      if (!USERNAME_PATTERN.test(raw)) {
        setUsernameStatus('invalid');
        return;
      }
      if (raw === lastCheckedRef.current) return;

      checkTimerRef.current = setTimeout(async () => {
        lastCheckedRef.current = raw;
        setUsernameStatus('checking');
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL;
          const res = await fetch(
            `${apiUrl}/api/auth/check-username?username=${encodeURIComponent(raw)}`,
            token
              ? { headers: { Authorization: `Bearer ${token}` } }
              : undefined,
          );
          const data = await res.json();
          // Stale response for a value the user has already moved away from.
          if (latestInputRef.current !== raw) return;
          if (data.success) {
            setUsernameStatus(data.data.available ? 'available' : 'taken');
          } else {
            setUsernameStatus('idle');
          }
        } catch {
          if (latestInputRef.current !== raw) return;
          setUsernameStatus('idle');
        }
      }, 400);
    },
    [token],
  );

  return { usernameStatus, handleUsernameChange };
}

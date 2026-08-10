/**
 * @file install.ts
 * @description Helpers for the Chromium `beforeinstallprompt` / `appinstalled`
 * installation flow. The install-prompt event is a non-standard Web API, so
 * its shape is declared here and reused by the install hook and tests.
 */

/** The Chromium `beforeinstallprompt` event. Not part of the DOM lib. */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const INSTALL_PROMPT_EVENT = 'beforeinstallprompt';
export const APP_INSTALLED_EVENT = 'appinstalled';

/** Whether this browser exposes the Chromium install-prompt API at all. */
export const supportsInstallPrompt = (): boolean =>
  typeof window !== 'undefined' && 'onbeforeinstallprompt' in window;

export type PromptOutcome = 'accepted' | 'dismissed' | 'error';

/**
 * Invoke the deferred native install prompt. Returns the user's choice, or
 * `'error'` if the prompt itself fails (e.g. called twice, or installability
 * was revoked). Failures are intentionally non-throwing so callers can fall
 * back gracefully.
 */
export const promptToInstall = async (event: BeforeInstallPromptEvent): Promise<PromptOutcome> => {
  try {
    await event.prompt();
    const choice = await event.userChoice;
    return choice.outcome === 'accepted' ? 'accepted' : 'dismissed';
  } catch {
    return 'error';
  }
};

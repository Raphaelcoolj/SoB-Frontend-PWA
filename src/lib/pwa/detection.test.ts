import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isStandalone, isIos, isIosSafari } from './detection';

let matchMediaMatches = false;
let userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function setMatchMedia(matches: boolean): void {
  matchMediaMatches = matches;
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: matchMediaMatches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function setUserAgent(ua: string): void {
  userAgent = ua;
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    get: () => userAgent,
  });
}

function setNavigatorStandalone(value: boolean): void {
  Object.defineProperty(window.navigator, 'standalone', {
    configurable: true,
    get: () => value,
  });
}

function setMaxTouchPoints(points: number): void {
  Object.defineProperty(window.navigator, 'maxTouchPoints', {
    configurable: true,
    get: () => points,
  });
}

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1';
const IPHONE_FIREFOX =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/120.0 Mobile/15E148 Safari/605.1.15';
const IPAD_DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36';

describe('isStandalone', () => {
  beforeEach(() => {
    setMatchMedia(false);
    setUserAgent(ANDROID_CHROME);
    setNavigatorStandalone(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false in browser display mode', () => {
    expect(isStandalone()).toBe(false);
  });

  it('returns true when display-mode is standalone', () => {
    setMatchMedia(true);
    expect(isStandalone()).toBe(true);
  });

  it('returns true when the legacy iOS navigator.standalone flag is set', () => {
    setMatchMedia(false);
    setNavigatorStandalone(true);
    expect(isStandalone()).toBe(true);
  });
});

describe('isIos', () => {
  beforeEach(() => {
    setUserAgent(ANDROID_CHROME);
    setMaxTouchPoints(0);
  });

  it('returns false on Android', () => {
    expect(isIos()).toBe(false);
  });

  it('returns false on a desktop Mac Safari', () => {
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15');
    setMaxTouchPoints(0);
    expect(isIos()).toBe(false);
  });

  it('returns true on an iPhone', () => {
    setUserAgent(IPHONE_SAFARI);
    expect(isIos()).toBe(true);
  });

  it('detects iPadOS 13+ which reports a desktop Mac UA', () => {
    setUserAgent(IPAD_DESKTOP_UA);
    setMaxTouchPoints(5);
    expect(isIos()).toBe(true);
  });
});

describe('isIosSafari', () => {
  beforeEach(() => {
    setUserAgent(IPHONE_SAFARI);
    setMaxTouchPoints(5);
  });

  it('returns true for Safari on iPhone', () => {
    expect(isIosSafari()).toBe(true);
  });

  it('returns false for Chrome on iPhone', () => {
    setUserAgent(IPHONE_CHROME);
    expect(isIosSafari()).toBe(false);
  });

  it('returns false for Firefox on iPhone', () => {
    setUserAgent(IPHONE_FIREFOX);
    expect(isIosSafari()).toBe(false);
  });

  it('returns false on Android', () => {
    setUserAgent(ANDROID_CHROME);
    expect(isIosSafari()).toBe(false);
  });

  it('returns false on a desktop browser', () => {
    setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36');
    setMaxTouchPoints(0);
    expect(isIosSafari()).toBe(false);
  });
});

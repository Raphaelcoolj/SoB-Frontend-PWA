import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * The analytics module keeps module-level buffer/timer state. Import a fresh
 * copy per test (vi.resetModules) so buffered events never leak between tests.
 */

const FRESH = () => import('./analytics');

describe('client analytics tracker', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 200 })),
    );
  });

  it('buffers events and flushes them as a batch with the expected payload', async () => {
    const { track, flushAnalytics } = await FRESH();

    track({ event: 'post_viewed', properties: { postId: 'abc', n: 1, ok: true } });
    expect(fetch).not.toHaveBeenCalled();

    flushAnalytics();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/api/analytics/track/batch');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body.events).toHaveLength(1);
    expect(body.events[0].event).toBe('post_viewed');
    expect(body.events[0].properties).toEqual({ postId: 'abc', n: 1, ok: true });
    expect(body.events[0]).not.toHaveProperty('userId');
  });

  it('never sends a userId even when one is passed', async () => {
    const { track, flushAnalytics } = await FRESH();
    track({ event: 'post_liked', properties: { postId: 'x' }, context: { platform: 'pwa' } });
    flushAnalytics();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const { events } = JSON.parse((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string);
    expect(events[0]).not.toHaveProperty('userId');
  });

  it('drops sensitive keys and non-primitive property values', async () => {
    const { track, flushAnalytics } = await FRESH();
    track({
      event: 'signup_started',
      properties: {
        method: 'email',
        password: 'secret',
        token: 't',
        email: 'a@b.com',
        nested: { a: 1 },
        list: [1, 2],
      } as Record<string, string | number | boolean | null | undefined>,
    });
    flushAnalytics();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const { events } = JSON.parse((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string);
    expect(events[0].properties).toEqual({ method: 'email' });
  });

  it('generates a stable anonymousId and a per-tab sessionId', async () => {
    const { track, flushAnalytics, getAnonymousId, getSessionId } = await FRESH();

    const anon1 = getAnonymousId();
    const sess1 = getSessionId();
    expect(anon1).toBeTruthy();
    expect(sess1).toBeTruthy();

    // Same module instance → same ids (persisted).
    track({ event: 'page_viewed' });
    flushAnalytics();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const { events } = JSON.parse((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string);
    expect(events[0].anonymousId).toBe(anon1);
    expect(events[0].sessionId).toBe(sess1);

    // Reload (new module copy, same tab): anonymousID AND sessionId persist —
    // a session survives reloads; only a new tab starts a fresh session.
    const reloaded = await FRESH();
    expect(reloaded.getAnonymousId()).toBe(anon1);
    expect(reloaded.getSessionId()).toBe(sess1);

    // New tab (sessionStorage cleared): sessionId is fresh, anonymousId stays.
    window.sessionStorage.clear();
    const newTab = await FRESH();
    expect(newTab.getAnonymousId()).toBe(anon1);
    expect(newTab.getSessionId()).not.toBe(sess1);
  });

  it('endSession records session_ended with the elapsed duration and flushes', async () => {
    const { startSession, endSession } = await FRESH();
    vi.useFakeTimers();
    try {
      startSession();
      vi.advanceTimersByTime(65_000); // interval timer flushes session_started
      endSession();
      vi.advanceTimersByTime(0);
      await vi.waitFor(() => {
        expect((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(2);
      });
      const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
      const lastBody = JSON.parse(calls[calls.length - 1][1].body as string);
      const ended = lastBody.events.find((e: { event: string }) => e.event === 'session_ended');
      expect(ended).toBeDefined();
      expect(ended.properties.durationSec).toBeGreaterThanOrEqual(60);
    } finally {
      vi.useRealTimers();
    }
  });
});

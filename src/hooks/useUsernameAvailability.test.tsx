import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUsernameAvailability } from './useUsernameAvailability';

const okResponse = (available: boolean) => ({
  json: async () => ({ success: true, data: { available } }),
});

describe('useUsernameAvailability', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    process.env.NEXT_PUBLIC_API_URL = 'http://api.test';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('debounces the check and marks a username as available', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(true));
    global.fetch = fetchMock as never;

    const { result } = renderHook(() => useUsernameAvailability(null));

    act(() => result.current.handleUsernameChange('janedoe'));
    expect(result.current.usernameStatus).toBe('idle');

    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(result.current.usernameStatus).toBe('idle');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.usernameStatus).toBe('checking');

    await act(async () => {});
    expect(result.current.usernameStatus).toBe('available');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/auth/check-username?username=janedoe',
      undefined,
    );
  });

  it('marks a username as taken when the server reports it unavailable', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(false)) as never;

    const { result } = renderHook(() => useUsernameAvailability(null));

    act(() => result.current.handleUsernameChange('janedoe'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(result.current.usernameStatus).toBe('taken');
  });

  it('discards a stale response for an older value (does not flip the current status)', async () => {
    const resolvers: Array<(r: unknown) => void> = [];
    global.fetch = vi.fn(
      () => new Promise((resolve) => resolvers.push(resolve)),
    ) as never;

    const { result } = renderHook(() => useUsernameAvailability(null));

    act(() => result.current.handleUsernameChange('jane'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(resolvers).toHaveLength(1);

    act(() => result.current.handleUsernameChange('janedoe'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(resolvers).toHaveLength(2);

    // Newer request resolves first (available)...
    await act(async () => {
      resolvers[1]?.(okResponse(true));
      await Promise.resolve();
    });
    expect(result.current.usernameStatus).toBe('available');

    // ...then the older "jane" request resolves as taken — it must be ignored.
    await act(async () => {
      resolvers[0]?.(okResponse(false));
      await Promise.resolve();
    });
    expect(result.current.usernameStatus).toBe('available');
  });

  it('sends the auth header when a token is provided (onboarding re-check)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(true));
    global.fetch = fetchMock as never;

    const { result } = renderHook(() => useUsernameAvailability('my-pending-token'));

    act(() => result.current.handleUsernameChange('janedoe'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/auth/check-username?username=janedoe',
      { headers: { Authorization: 'Bearer my-pending-token' } },
    );
  });

  it('does not re-check a value that was already checked (one request per user action)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(true));
    global.fetch = fetchMock as never;

    const { result } = renderHook(() => useUsernameAvailability(null));

    act(() => result.current.handleUsernameChange('janedoe'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => result.current.handleUsernameChange('janedoe'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not fetch for short or invalid usernames', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as never;

    const { result } = renderHook(() => useUsernameAvailability(null));

    act(() => result.current.handleUsernameChange('ab'));
    expect(result.current.usernameStatus).toBe('idle');

    act(() => result.current.handleUsernameChange('bad-name!'));
    expect(result.current.usernameStatus).toBe('invalid');

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

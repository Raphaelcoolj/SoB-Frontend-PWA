import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithAuth } from './api';
import { useAuthStore } from '../store/authStore';

describe('fetchWithAuth', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      pendingToken: null,
      pendingProfile: null,
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('does not attach Authorization header on public auth endpoints when no token exists', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    global.fetch = mockFetch;

    await fetchWithAuth('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callArgs = mockFetch.mock.calls[0];
    const headers = callArgs[1].headers;
    expect(headers['Authorization']).toBeUndefined();
  });

  it('returns response directly without attempting refresh on public auth endpoints when 401 is received', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: false, message: 'Invalid credentials.' }), { status: 401 })
    );
    global.fetch = mockFetch;

    const res = await fetchWithAuth('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'wrong' }),
    });

    expect(res.status).toBe(401);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('attaches Authorization header for authenticated endpoints when accessToken exists', async () => {
    useAuthStore.setState({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
    });

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { user: { id: '1' } } }), { status: 200 })
    );
    global.fetch = mockFetch;

    await fetchWithAuth('/api/users/me', { method: 'GET' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBe('Bearer test-access-token');
  });

  it('refreshes token on 401 for authenticated endpoints when refreshToken is present', async () => {
    useAuthStore.setState({
      accessToken: 'expired-access-token',
      refreshToken: 'valid-refresh-token',
    });

    const mockFetch = vi.fn()
      // First call to /api/users/me -> 401
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: false }), { status: 401 }))
      // Second call to /api/auth/refresh -> 200 with new tokens
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: { accessToken: 'new-access-token', refreshToken: 'new-refresh-token' },
          }),
          { status: 200 }
        )
      )
      // Retry call to /api/users/me -> 200
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { user: {} } }), { status: 200 }));

    global.fetch = mockFetch;

    const res = await fetchWithAuth('/api/users/me', { method: 'GET' });

    expect(res.status).toBe(200);
    expect(useAuthStore.getState().accessToken).toBe('new-access-token');
    expect(useAuthStore.getState().refreshToken).toBe('new-refresh-token');
  });

  it('handles 401 on authenticated endpoint without refreshToken by returning response cleanly', async () => {
    useAuthStore.setState({
      accessToken: 'stale-token-no-refresh',
      refreshToken: null,
    });

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401 })
    );
    global.fetch = mockFetch;

    const res = await fetchWithAuth('/api/users/me', { method: 'GET' });

    expect(res.status).toBe(401);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});

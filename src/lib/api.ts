import { useAuthStore } from '../store/authStore';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

export const fetchWithAuth = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const { accessToken, refreshToken, setTokens, clearAuth } = useAuthStore.getState();

  let response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    },
    credentials: 'include',
  });

  if (response.status === 401) {
    if (isRefreshing) {
      // Queue this request until refresh completes
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(token => {
        return fetch(`${BASE_URL}${endpoint}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        });
      }) as Promise<Response>;
    }

    isRefreshing = true;

    try {
      const refreshResponse = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include',
      });

      if (!refreshResponse.ok) throw new Error('Refresh failed');

      const data = await refreshResponse.json();
      const newAccessToken = data.data.accessToken;

      setTokens(newAccessToken, refreshToken!);
      processQueue(null, newAccessToken);

      // Retry original request with new token
      response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
          Authorization: `Bearer ${newAccessToken}`,
        },
        credentials: 'include',
      });
    } catch (error) {
      processQueue(error, null);
      clearAuth();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw error;
    } finally {
      isRefreshing = false;
    }
  }

  return response;
};

// Keeping api object temporarily for easier replacement or if needed for specific use cases
export const api = {
  get: (endpoint: string) => fetchWithAuth(endpoint, { method: 'GET' }),
  post: (endpoint: string, body: unknown) =>
    fetchWithAuth(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  put: (endpoint: string, body: unknown) =>
    fetchWithAuth(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  delete: (endpoint: string) => fetchWithAuth(endpoint, { method: 'DELETE' }),
};

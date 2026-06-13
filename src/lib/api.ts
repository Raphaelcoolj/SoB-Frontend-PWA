const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const api = {
  get: (endpoint: string, token?: string) =>
    fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
    }),

  post: (endpoint: string, body: unknown, token?: string) =>
    fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
      body: JSON.stringify(body),
    }),

  put: (endpoint: string, body: unknown, token?: string) =>
    fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
      body: JSON.stringify(body),
    }),

  delete: (endpoint: string, token?: string) =>
    fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
    }),
};

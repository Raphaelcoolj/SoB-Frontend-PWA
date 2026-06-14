import { useAuthStore } from '@/store/authStore'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  failedQueue = []
}

const forceLogout = () => {
  const { clearAuth } = useAuthStore.getState()
  clearAuth()
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

export const fetchWithAuth = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const { accessToken, refreshToken, setTokens } = useAuthStore.getState()
  
  // NEW: Deep debug
  console.log(`[DEBUG] fetchWithAuth to ${endpoint}`);
  console.log(`[DEBUG] Token present: ${!!accessToken}`);
  console.log(`[DEBUG] Token length: ${accessToken?.length || 0}`);

  const makeRequest = (token: string | null) =>
    fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
    })

  let response = await makeRequest(accessToken)

  // If not 401, return immediately — no refresh needed
  if (response.status !== 401) {
    return response
  }

  // 401 received — check for USER_DELETED first
  const cloned = response.clone()
  const errorData = await cloned.json().catch(() => null)

  if (errorData?.error === 'USER_DELETED' || !refreshToken) {
    forceLogout()
    throw new Error(errorData?.message || 'Session expired')
  }

  // If already refreshing, queue this request
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject })
    }).then((newToken) => makeRequest(newToken as string))
  }

  isRefreshing = true

  try {
    const refreshResponse = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      credentials: 'include',
    })

    if (!refreshResponse.ok) {
      throw new Error('Refresh token expired or invalid')
    }

    const data = await refreshResponse.json()
    const newAccessToken = data.data.accessToken
    const newRefreshToken = data.data.refreshToken || refreshToken

    setTokens(newAccessToken, newRefreshToken)
    processQueue(null, newAccessToken)

    return makeRequest(newAccessToken)
  } finally {
    isRefreshing = false
  }
}

// FIXED: Re-added api object for backward compatibility
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


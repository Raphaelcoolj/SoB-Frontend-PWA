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

const PUBLIC_AUTH_ENDPOINTS = [
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/oauth/exchange',
  '/api/auth/refresh',
  '/api/homepage',
]

export const fetchWithAuth = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const { accessToken, refreshToken, setTokens } = useAuthStore.getState()
  const isPublicEndpoint = PUBLIC_AUTH_ENDPOINTS.some((p) => endpoint.includes(p))

  const makeRequest = (token: string | null) => {
    const isFormData = options.body instanceof FormData
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL || ''}${endpoint}`
    const customHeaders = (options.headers as Record<string, string>) || {}
    const hasCustomAuth = Boolean(customHeaders['Authorization'] || customHeaders['authorization'])

    return fetch(url, {
      ...options,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...customHeaders,
        ...(!hasCustomAuth && !isPublicEndpoint && token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
  }

  const response = await makeRequest(accessToken)

  // If not 401, or if this is a public auth endpoint, return immediately — no refresh needed
  if (response.status !== 401 || isPublicEndpoint) {
    return response
  }

  // 401 received on an authenticated endpoint — check for USER_DELETED first
  const cloned = response.clone()
  const errorData = await cloned.json().catch(() => null)

  if (errorData?.error === 'USER_DELETED' || !refreshToken) {
    if (accessToken || refreshToken) {
      forceLogout()
    }
    return response
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
      forceLogout()
      return response
    }

    const data = await refreshResponse.json()
    const newAccessToken = data.data.accessToken
    const newRefreshToken = data.data.refreshToken || refreshToken

    setTokens(newAccessToken, newRefreshToken)
    processQueue(null, newAccessToken)

    return makeRequest(newAccessToken)
  } catch {
    forceLogout()
    return response
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


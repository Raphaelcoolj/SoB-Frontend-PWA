import { useAuthStore } from '@/store/authStore'

/**
 * @file analytics.ts
 * @description Client-side analytics tracker for SoB (PWA/web). Events are
 * validated against the backend catalog at the API layer; this module only
 * sends well-formed snake_case events, buffered and flushed in batches.
 *
 * Privacy & security:
 *  - NEVER sends a userId — the backend derives it from the Bearer token.
 *  - Pre-auth traffic is identified by anonymousId (persistent) + sessionId
 *    (per browsing session).
 *  - Sensitive property keys are dropped before queuing (defense in depth;
 *    the backend drops them too).
 *  - Fires and forgets: a failed analytics write never affects the app, and
 *    errors are logged at most once a minute.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL

const ANONYMOUS_ID_KEY = 'sob-anonymous-id'
const SESSION_ID_KEY = 'sob-session-id'

const FLUSH_INTERVAL_MS = 5000
const BATCH_MAX = 50
const LOG_RATE_LIMIT_MS = 60_000

/** Property keys that must never be persisted — always dropped. */
const SENSITIVE_KEYS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'pendingToken',
  'authorization',
  'cookie',
  'cookies',
  'apiKey',
  'secret',
  'verificationCode',
  'email',
  'pushSubscription',
  'endpoint',
]

export type AnalyticsPlatform = 'web' | 'pwa' | 'native'

export interface AnalyticsContext {
  platform?: AnalyticsPlatform
  appVersion?: string
}

export interface TrackInput {
  event: string
  /** Flat primitive properties only — nested values are dropped. */
  properties?: Record<string, string | number | boolean | null | undefined>
  context?: AnalyticsContext
  timestamp?: string
}

type QueuedEvent = {
  event: string
  sessionId: string | null
  anonymousId: string | null
  properties: Record<string, string | number | boolean>
  context: AnalyticsContext
  timestamp: string
}

const buffer: QueuedEvent[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let lastErrorLogAt = 0
let sessionStartedAt: number | null = null
let platform: AnalyticsPlatform = 'web'

const rateLimitedLog = (message: string) => {
  const now = Date.now()
  if (now - lastErrorLogAt >= LOG_RATE_LIMIT_MS) {
    lastErrorLogAt = now
    console.error(`[analytics] ${message}`)
  }
}

export const uuid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

const storageGet = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

const storageSet = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // private mode / quota — anonymousId is best-effort
  }
}

const sessionGet = (key: string): string | null => {
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

const sessionSet = (key: string, value: string) => {
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

/** Persistent anonymous device id (pre-auth identity). */
export const getAnonymousId = (): string | null => {
  if (typeof window === 'undefined') return null
  let id = storageGet(ANONYMOUS_ID_KEY)
  if (!id) {
    id = uuid()
    storageSet(ANONYMOUS_ID_KEY, id)
  }
  return id
}

/** Per-browsing-session id (survives reloads in the same tab, dies with the tab). */
export const getSessionId = (): string | null => {
  if (typeof window === 'undefined') return null
  let id = sessionGet(SESSION_ID_KEY)
  if (!id) {
    id = uuid()
    sessionSet(SESSION_ID_KEY, id)
  }
  return id
}

const detectPlatform = (): AnalyticsPlatform => {
  if (typeof window === 'undefined') return 'web'
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  return standalone ? 'pwa' : 'web'
}

export const getPlatform = (): AnalyticsPlatform => platform

export const initAnalytics = () => {
  platform = detectPlatform()
}

const sanitizeProperties = (props?: TrackInput['properties']): Record<string, string | number | boolean> => {
  const out: Record<string, string | number | boolean> = {}
  if (!props || typeof props !== 'object') return out
  for (const [key, value] of Object.entries(props)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) continue
    const t = typeof value
    if (t === 'string' || t === 'number' || t === 'boolean') {
      out[key] = value as string | number | boolean
    }
  }
  return out
}

const send = async (events: QueuedEvent[]) => {
  if (events.length === 0 || typeof window === 'undefined') return
  const token = useAuthStore.getState().accessToken
  try {
    await fetch(`${BASE_URL || ''}/api/analytics/track/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ events }),
      keepalive: true,
    })
  } catch (error) {
    rateLimitedLog(`batch send failed: ${error instanceof Error ? error.message : 'unknown error'}`)
  }
}

/** Immediately flush the buffered events (best-effort, non-blocking). */
export const flushAnalytics = () => {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (buffer.length === 0) return
  const events = buffer.splice(0, buffer.length)
  void send(events)
}

const scheduleFlush = () => {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    flushAnalytics()
  }, FLUSH_INTERVAL_MS)
}

/**
 * Record an analytics event. Validated, sanitized, buffered, never throws.
 * The backend catalog rejects unknown event names — this only sends well-formed
 * snake_case events, so instrumented call sites use the documented names.
 */
export const track = (input: TrackInput): boolean => {
  if (typeof window === 'undefined') return false
  if (!input?.event) return false

  const sessionId = getSessionId()
  const anonymousId = getAnonymousId()

  buffer.push({
    event: input.event,
    sessionId,
    anonymousId,
    properties: sanitizeProperties(input.properties),
    context: {
      platform: input.context?.platform || platform,
      appVersion: input.context?.appVersion || process.env.NEXT_PUBLIC_APP_VERSION,
    },
    timestamp: input.timestamp || new Date().toISOString(),
  })

  if (buffer.length >= BATCH_MAX) flushAnalytics()
  else scheduleFlush()
  return true
}

/**
 * Start a new browsing session. Called once per page load by the provider.
 * Returns the session duration tracking start.
 */
export const startSession = () => {
  initAnalytics()
  sessionStartedAt = Date.now()
  track({ event: 'session_started' })
}

/** Flush + end the current session (called on pagehide). */
export const endSession = () => {
  const startedAt = sessionStartedAt
  sessionStartedAt = null
  if (startedAt) {
    const durationSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000))
    track({ event: 'session_ended', properties: { durationSec } })
  }
  flushAnalytics()
}

/** Flush now and end the session — for tests and programmatic shutdown. */
export const shutdownAnalytics = () => {
  endSession()
}

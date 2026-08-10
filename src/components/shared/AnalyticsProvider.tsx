'use client'

/**
 * @file AnalyticsProvider.tsx
 * @description Renders nothing — owns the client-side analytics lifecycle:
 *  - starts a browsing session on mount (session_started)
 *  - tracks page_viewed on every route change (App Router pathname)
 *  - ends the session + flushes buffered events on pagehide/visibility hidden
 *  - captures uncaught errors + unhandled rejections as client_error
 *  - flushes periodically so events don't wait for a page transition
 */

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { startSession, endSession, flushAnalytics, track } from '../../lib/analytics'

const ERROR_LOG_RATE_MS = 60_000

const truncate = (value: string, max = 200) => (value.length > max ? `${value.slice(0, max)}…` : value)

const isClientSideError = (message: string) =>
  !/loading chunk|load failed|hydration|ResizeObserver loop|Script error/i.test(message)

export default function AnalyticsProvider() {
  const pathname = usePathname()
  const lastPathRef = useRef<string | null>(null)
  const lastErrorLogAtRef = useRef(0)

  useEffect(() => {
    startSession()
    flushAnalytics()
  }, [])

  // Track page views on client-side route changes.
  useEffect(() => {
    if (lastPathRef.current === pathname) return
    lastPathRef.current = pathname
    track({ event: 'page_viewed', properties: { path: truncate(pathname || '/', 120) } })
  }, [pathname])

  useEffect(() => {
    const handlePageHide = () => {
      endSession()
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // Page is going to background — don't end the session (user may come
        // back), but flush what we have so events aren't lost.
        flushAnalytics()
      }
    }
    const handleError = (event: ErrorEvent) => {
      const message = event.message || 'window error'
      if (!isClientSideError(message)) return
      const now = Date.now()
      if (now - lastErrorLogAtRef.current < ERROR_LOG_RATE_MS) return
      lastErrorLogAtRef.current = now
      track({
        event: 'client_error',
        properties: {
          message: truncate(message),
          source: truncate(event.filename || '', 120),
          line: event.lineno ?? undefined,
          column: event.colno ?? undefined,
        },
      })
    }
    const handleRejection = (event: PromiseRejectionEvent) => {
      const now = Date.now()
      if (now - lastErrorLogAtRef.current < ERROR_LOG_RATE_MS) return
      lastErrorLogAtRef.current = now
      const reason = event.reason
      track({
        event: 'client_error',
        properties: {
          message: truncate(
            typeof reason === 'string'
              ? reason
              : reason instanceof Error
                ? reason.message
                : 'unhandled promise rejection',
          ),
          source: 'unhandledrejection',
        },
      })
    }

    window.addEventListener('pagehide', handlePageHide)
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      window.removeEventListener('pagehide', handlePageHide)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])

  return null
}

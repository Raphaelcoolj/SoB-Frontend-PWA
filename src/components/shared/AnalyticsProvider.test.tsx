import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import AnalyticsProvider from './AnalyticsProvider'

const mocks = vi.hoisted(() => ({
  startSession: vi.fn(),
  endSession: vi.fn(),
  flushAnalytics: vi.fn(),
  track: vi.fn(),
  pathname: '/home',
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
}))

vi.mock('../../lib/analytics', () => ({
  startSession: mocks.startSession,
  endSession: mocks.endSession,
  flushAnalytics: mocks.flushAnalytics,
  track: mocks.track,
}))

describe('AnalyticsProvider', () => {
  beforeEach(() => {
    mocks.startSession.mockClear()
    mocks.endSession.mockClear()
    mocks.flushAnalytics.mockClear()
    mocks.track.mockClear()
  })

  it('starts a session and tracks the initial page view on mount', () => {
    mocks.pathname = '/home'
    render(<AnalyticsProvider />)
    expect(mocks.startSession).toHaveBeenCalledTimes(1)
    expect(mocks.track).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'page_viewed', properties: { path: '/home' } }),
    )
  })

  it('tracks page_viewed on route changes', () => {
    mocks.pathname = '/home'
    const { rerender } = render(<AnalyticsProvider />)
    mocks.track.mockClear()

    mocks.pathname = '/explore'
    rerender(<AnalyticsProvider />)
    expect(mocks.track).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'page_viewed', properties: { path: '/explore' } }),
    )
  })

  it('ends the session when the page is hidden', () => {
    render(<AnalyticsProvider />)
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(mocks.endSession).toHaveBeenCalledTimes(1)
  })

  it('flushes without ending the session when the tab goes to background', () => {
    render(<AnalyticsProvider />)
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(mocks.flushAnalytics).toHaveBeenCalledTimes(1)
    expect(mocks.endSession).not.toHaveBeenCalled()
  })
})

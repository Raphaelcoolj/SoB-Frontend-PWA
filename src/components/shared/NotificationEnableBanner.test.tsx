import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import NotificationEnableBanner from './NotificationEnableBanner';
import type { PushEnableState } from '../../hooks/usePushEnable';

const mocks = vi.hoisted(() => ({
  hookState: { status: 'checking' } as PushEnableState,
  enable: vi.fn(async () => {}),
  push: vi.fn(),
  platform: 'web',
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('../../store/authStore', () => ({
  useAuthStore: () => ({ user: { _id: 'u1', name: 'Test User' } }),
}));

vi.mock('../../hooks/usePushEnable', () => ({
  usePushEnable: () => ({
    state: mocks.hookState,
    enable: mocks.enable,
    deviceId: 'dev-1',
    platform: mocks.platform,
  }),
}));

vi.mock('../../lib/push', () => ({
  getPushPlatform: () => mocks.platform,
}));

beforeAll(() => {
  // jsdom does not implement matchMedia; the banner reads display-mode.
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('NotificationEnableBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mocks.hookState = { status: 'checking' };
    mocks.platform = 'web';
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing while checking status', () => {
    const { container } = render(<NotificationEnableBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the prompt after a delay when push is not enabled on this device', () => {
    mocks.hookState = { status: 'prompt' };
    const { container } = render(<NotificationEnableBanner />);
    expect(container.firstChild).toBeNull();

    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(screen.getByText('Get notified even when you are away')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enable' })).toBeInTheDocument();
  });

  it('enables push when Enable is tapped', async () => {
    mocks.hookState = { status: 'prompt' };
    render(<NotificationEnableBanner />);
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enable' }));
    expect(mocks.enable).toHaveBeenCalledTimes(1);
  });

  it('hides the banner after enablement succeeds', () => {
    mocks.hookState = { status: 'prompt' };
    const { rerender } = render(<NotificationEnableBanner />);
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(screen.getByText('Get notified even when you are away')).toBeInTheDocument();

    mocks.hookState = { status: 'enabled' };
    rerender(<NotificationEnableBanner />);
    expect(screen.queryByText('Get notified even when you are away')).not.toBeInTheDocument();
  });

  it('dismisses permanently until the re-ask window elapses', () => {
    mocks.hookState = { status: 'prompt' };
    const { rerender } = render(<NotificationEnableBanner />);
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification prompt' }));

    expect(screen.queryByText('Get notified even when you are away')).not.toBeInTheDocument();

    // Re-render shortly after: still hidden.
    rerender(<NotificationEnableBanner />);
    expect(screen.queryByText('Get notified even when you are away')).not.toBeInTheDocument();
  });

  it('shows the blocked variant with a settings link when permission is denied', () => {
    mocks.hookState = { status: 'denied' };
    render(<NotificationEnableBanner />);
    expect(screen.getByText('Notifications are blocked for this browser.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    expect(mocks.push).toHaveBeenCalledWith('/settings/notifications');
  });

  it('shows the error variant with a retry action', () => {
    mocks.hookState = { status: 'error', message: 'VAPID key not configured' };
    render(<NotificationEnableBanner />);
    expect(screen.getByText('VAPID key not configured')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('hides on iOS Safari unless the PWA is installed', () => {
    mocks.platform = 'ios';
    mocks.hookState = { status: 'prompt' };
    const { container } = render(<NotificationEnableBanner />);
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(container.firstChild).toBeNull();
  });
});

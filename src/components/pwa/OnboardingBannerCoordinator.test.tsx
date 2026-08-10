import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import OnboardingBannerCoordinator from './OnboardingBannerCoordinator';
import type { PwaInstallStatus } from '../../hooks/usePwaInstall';

const mocks = vi.hoisted(() => ({
  status: 'checking' as PwaInstallStatus,
  install: vi.fn(async () => {}),
  dismiss: vi.fn(() => {
    mocks.status = 'dismissed';
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('../../hooks/usePwaInstall', () => ({
  usePwaInstall: () => ({
    status: mocks.status,
    install: mocks.install,
    dismiss: mocks.dismiss,
  }),
}));

// NotificationEnableBanner reads display-mode; jsdom lacks matchMedia.
beforeAll(() => {
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

describe('OnboardingBannerCoordinator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mocks.status = 'checking';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing while the environment is being resolved', () => {
    const { container } = render(<OnboardingBannerCoordinator />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the install banner when installable (and not the notification banner)', () => {
    mocks.status = 'installable';
    const { container } = render(<OnboardingBannerCoordinator />);
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(screen.getByText('Get the full SoB experience')).toBeInTheDocument();
    expect(screen.queryByText('Get notified even when you are away')).not.toBeInTheDocument();
    expect(container.firstChild).not.toBeNull();
  });

  it('dismissing the install banner calls dismiss for this load', () => {
    mocks.status = 'installable';
    render(<OnboardingBannerCoordinator />);
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss install prompt' }));
    expect(mocks.dismiss).toHaveBeenCalledTimes(1);
  });

  it('falls back to no install banner once dismissed', () => {
    mocks.status = 'installable';
    const { rerender } = render(<OnboardingBannerCoordinator />);
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(screen.getByText('Get the full SoB experience')).toBeInTheDocument();

    mocks.status = 'dismissed';
    rerender(<OnboardingBannerCoordinator />);
    expect(screen.queryByText('Get the full SoB experience')).not.toBeInTheDocument();
  });

  it('never renders the install banner when already installed/standalone', () => {
    mocks.status = 'installed';
    render(<OnboardingBannerCoordinator />);
    expect(screen.queryByText('Get the full SoB experience')).not.toBeInTheDocument();
    expect(screen.queryByText('Install SoB')).not.toBeInTheDocument();
  });
});

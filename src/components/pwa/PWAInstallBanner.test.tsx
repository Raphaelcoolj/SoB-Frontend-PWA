import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PWAInstallBanner from './PWAInstallBanner';

describe('PWAInstallBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stays hidden until the reveal delay elapses', () => {
    const { container } = render(
      <PWAInstallBanner status="installable" onInstall={vi.fn()} onDismiss={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();

    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(screen.getByText('Get the full SoB experience')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Install SoB' })).toBeInTheDocument();
  });

  it('invokes the native install prompt for Chromium', () => {
    const onInstall = vi.fn();
    render(<PWAInstallBanner status="installable" onInstall={onInstall} onDismiss={vi.fn()} />);
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Install SoB' }));
    expect(onInstall).toHaveBeenCalledTimes(1);
  });

  it('dismisses for the current load', () => {
    const onDismiss = vi.fn();
    render(<PWAInstallBanner status="installable" onInstall={vi.fn()} onDismiss={onDismiss} />);
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss install prompt' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('opens iOS instructions instead of calling a browser API on Safari', () => {
    const onInstall = vi.fn();
    render(<PWAInstallBanner status="iosSafari" onInstall={onInstall} onDismiss={vi.fn()} />);
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Install SoB' }));
    expect(onInstall).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Install SoB on your iPhone')).toBeInTheDocument();
  });

  it('explains the Safari flow to iOS non-Safari browsers', () => {
    render(<PWAInstallBanner status="iosNonSafari" onInstall={vi.fn()} onDismiss={vi.fn()} />);
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(screen.getByText('Install SoB with Safari')).toBeInTheDocument();
    expect(
      screen.getByText('To install SoB on your iPhone, open this page in Safari and use Share → Add to Home Screen.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'How it works' })).toBeInTheDocument();
  });

  it('shows immediately while an install is in progress', () => {
    render(<PWAInstallBanner status="installing" installing onInstall={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText('Get the full SoB experience')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Install SoB' });
    expect(button).toBeDisabled();
  });
});

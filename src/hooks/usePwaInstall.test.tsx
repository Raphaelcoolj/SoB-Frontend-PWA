import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { usePwaInstall } from './usePwaInstall';
import type { BeforeInstallPromptEvent } from '../lib/pwa/install';

// jsdom does not implement matchMedia; standalone detection reads it.
// Redefine it (not vi.spyOn) so restoring between tests is reliable.
function setMatchMedia(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

setMatchMedia(false);

function Harness() {
  const { status, install, dismiss } = usePwaInstall();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <button onClick={() => void install()}>install</button>
      <button onClick={dismiss}>dismiss</button>
    </div>
  );
}

function makePromptEvent(overrides: Partial<BeforeInstallPromptEvent> = {}): Event {
  const event = new Event('beforeinstallprompt');
  Object.assign(event, {
    prompt: vi.fn(async () => {}),
    userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    platforms: [],
    ...overrides,
  });
  return event;
}

describe('usePwaInstall', () => {
  beforeEach(() => {
    setMatchMedia(false);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves to notEligible on an unsupported desktop browser', async () => {
    render(<Harness />);
    expect(screen.getByTestId('status').textContent).toBe('checking');
    await act(async () => {
      vi.advanceTimersByTime(0);
    });
    expect(screen.getByTestId('status').textContent).toBe('notEligible');
  });

  it('never offers the banner when running standalone/installed', async () => {
    setMatchMedia(true);
    render(<Harness />);
    await act(async () => {
      vi.advanceTimersByTime(0);
    });
    expect(screen.getByTestId('status').textContent).toBe('installed');
  });

  it('resolves to installable when beforeinstallprompt fires', async () => {
    render(<Harness />);
    act(() => {
      window.dispatchEvent(new Event('beforeinstallprompt'));
    });
    await act(async () => {
      vi.advanceTimersByTime(0);
    });
    expect(screen.getByTestId('status').textContent).toBe('installable');
  });

  it('accepting the native prompt marks installation as completed', async () => {
    render(<Harness />);
    act(() => {
      window.dispatchEvent(makePromptEvent());
    });
    await act(async () => {
      vi.advanceTimersByTime(0);
    });
    expect(screen.getByTestId('status').textContent).toBe('installable');

    fireEvent.click(screen.getByText('install'));
    await act(async () => {});
    expect(screen.getByTestId('status').textContent).toBe('installedSuccessfully');
  });

  it('dismissing the native prompt does NOT treat the app as installed', async () => {
    render(<Harness />);
    act(() => {
      window.dispatchEvent(
        makePromptEvent({ userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }) })
      );
    });
    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    fireEvent.click(screen.getByText('install'));
    await act(async () => {});
    expect(screen.getByTestId('status').textContent).toBe('installable');
  });

  it('handles a failing native prompt gracefully', async () => {
    render(<Harness />);
    act(() => {
      window.dispatchEvent(
        makePromptEvent({
          prompt: vi.fn(async () => {
            throw new Error('prompt unavailable');
          }),
        })
      );
    });
    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    fireEvent.click(screen.getByText('install'));
    await act(async () => {});
    expect(screen.getByTestId('status').textContent).toBe('installable');
  });

  it('marks installation as completed when appinstalled fires', async () => {
    render(<Harness />);
    await act(async () => {
      vi.advanceTimersByTime(0);
    });
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    expect(screen.getByTestId('status').textContent).toBe('installedSuccessfully');
  });

  it('dismiss() hides the banner for the current load only', async () => {
    render(<Harness />);
    act(() => {
      window.dispatchEvent(new Event('beforeinstallprompt'));
    });
    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    fireEvent.click(screen.getByText('dismiss'));
    expect(screen.getByTestId('status').textContent).toBe('dismissed');
  });
});

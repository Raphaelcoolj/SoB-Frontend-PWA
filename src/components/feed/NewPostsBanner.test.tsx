import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import NewPostsBanner from './NewPostsBanner';

// Mock the socket singleton + auth store so tests are deterministic.
vi.mock('../../lib/socket', () => {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  return {
    socket: {
      on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
        (handlers[event] ||= []).push(cb);
      }),
      off: vi.fn(),
      emit: vi.fn(),
    },
    __handlers: handlers,
  };
});

vi.mock('../../store/authStore', () => ({
  useAuthStore: () => ({ accessToken: 'test-token' }),
}));

// Mutable SWR mock so tests can drive the server-reported fresh-post count.
const swrState: { data?: { count: number } | undefined; mutate: ReturnType<typeof vi.fn> } = {
  data: undefined,
  mutate: vi.fn(),
};
vi.mock('swr', () => ({ default: () => swrState }));

type SocketMock = {
  socket: {
    on: ReturnType<typeof vi.fn>;
    off: ReturnType<typeof vi.fn>;
    emit: ReturnType<typeof vi.fn>;
  };
  __handlers: Record<string, ((...args: unknown[]) => void)[]>;
};

const socketModule = (await import('../../lib/socket')) as unknown as SocketMock;
const { socket } = socketModule;
const { __handlers } = socketModule;

const fireSocket = (event: string) => {
  const cbs = __handlers[event] || [];
  act(() => cbs.forEach((cb) => cb({ at: new Date().toISOString() })));
};

const renderBanner = (overrides?: { newestCreatedAt?: string | null; onRefresh?: () => void }) =>
  render(
    <NewPostsBanner
      newestCreatedAt={overrides?.newestCreatedAt ?? '2026-01-01T00:00:00.000Z'}
      onRefresh={overrides?.onRefresh ?? (() => {})}
    />
  );

describe('NewPostsBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    swrState.data = undefined;
    Object.keys(__handlers).forEach((k) => delete __handlers[k]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing by default', () => {
    const { container } = renderBanner();
    expect(container.firstChild).toBeNull();
  });

  it('stays hidden when the server reports fewer than 10 new posts', () => {
    const { rerender } = renderBanner();
    act(() => {
      swrState.data = { count: 9 };
    });
    rerender(<NewPostsBanner newestCreatedAt="2026-01-01T00:00:00.000Z" onRefresh={() => {}} />);
    expect(screen.queryByText('New posts')).not.toBeInTheDocument();
  });

  it('becomes visible when the server reports at least 10 new posts', () => {
    const { rerender } = renderBanner();
    act(() => {
      swrState.data = { count: 10 };
    });
    rerender(<NewPostsBanner newestCreatedAt="2026-01-01T00:00:00.000Z" onRefresh={() => {}} />);
    expect(screen.getByText('New posts')).toBeInTheDocument();
  });

  it('hides and refreshes when tapped', () => {
    const onRefresh = vi.fn();
    const { rerender } = renderBanner({ onRefresh });
    act(() => {
      swrState.data = { count: 10 };
    });
    rerender(<NewPostsBanner newestCreatedAt="2026-01-01T00:00:00.000Z" onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText('New posts'));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('New posts')).not.toBeInTheDocument();
  });

  it('does not re-appear within the 5-minute cooldown after a tap', () => {
    const onRefresh = vi.fn();
    const { rerender } = renderBanner({ onRefresh });
    act(() => {
      swrState.data = { count: 10 };
    });
    rerender(<NewPostsBanner newestCreatedAt="2026-01-01T00:00:00.000Z" onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText('New posts'));

    vi.advanceTimersByTime(2 * 60 * 1000);
    act(() => {
      swrState.data = { count: 12 };
    });
    rerender(<NewPostsBanner newestCreatedAt="2026-01-01T00:00:00.000Z" onRefresh={onRefresh} />);
    expect(screen.queryByText('New posts')).not.toBeInTheDocument();
  });

  it('re-appears after the 5-minute cooldown if fresh posts remain', () => {
    const onRefresh = vi.fn();
    const { rerender } = renderBanner({ onRefresh });
    act(() => {
      swrState.data = { count: 10 };
    });
    rerender(<NewPostsBanner newestCreatedAt="2026-01-01T00:00:00.000Z" onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText('New posts'));

    act(() => {
      vi.advanceTimersByTime(6 * 60 * 1000);
    });
    act(() => {
      swrState.data = { count: 11 };
    });
    rerender(<NewPostsBanner newestCreatedAt="2026-01-01T00:00:00.000Z" onRefresh={onRefresh} />);
    expect(screen.getByText('New posts')).toBeInTheDocument();
  });

  it('re-checks the server count on the socket event instead of trusting it', () => {
    const { rerender } = renderBanner();
    fireSocket('feed:new_posts');
    expect(swrState.mutate).toHaveBeenCalled();
    act(() => {
      swrState.data = { count: 3 };
    });
    rerender(<NewPostsBanner newestCreatedAt="2026-01-01T00:00:00.000Z" onRefresh={() => {}} />);
    expect(screen.queryByText('New posts')).not.toBeInTheDocument();
  });

  it('registers the socket listener on mount', () => {
    renderBanner();
    expect(socket.on).toHaveBeenCalledWith('feed:new_posts', expect.any(Function));
  });
});

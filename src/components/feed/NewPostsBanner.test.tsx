import { describe, it, expect, vi, beforeEach } from 'vitest';
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

vi.mock('swr', () => ({ default: () => ({ data: undefined }) }));

const { socket } = await import('../../lib/socket');
const { __handlers } = await import('../../lib/socket');

const fireSocket = (event: string) => {
  const cbs = __handlers[event] || [];
  act(() => cbs.forEach((cb) => cb({ at: new Date().toISOString() })));
};

describe('NewPostsBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(__handlers).forEach((k) => delete __handlers[k]);
  });

  it('renders nothing by default', () => {
    const { container } = render(<NewPostsBanner newestCreatedAt="2026-01-01T00:00:00.000Z" onRefresh={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('becomes visible on the realtime feed:new_posts socket event', () => {
    render(<NewPostsBanner newestCreatedAt="2026-01-01T00:00:00.000Z" onRefresh={() => {}} />);
    fireSocket('feed:new_posts');
    expect(screen.getByText('New posts')).toBeInTheDocument();
  });

  it('hides and refreshes when tapped', () => {
    const onRefresh = vi.fn();
    render(<NewPostsBanner newestCreatedAt="2026-01-01T00:00:00.000Z" onRefresh={onRefresh} />);
    fireSocket('feed:new_posts');
    fireEvent.click(screen.getByText('New posts'));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('New posts')).not.toBeInTheDocument();
  });

  it('registers the socket listener on mount', () => {
    render(<NewPostsBanner newestCreatedAt="2026-01-01T00:00:00.000Z" onRefresh={() => {}} />);
    expect(socket.on).toHaveBeenCalledWith('feed:new_posts', expect.any(Function));
  });
});
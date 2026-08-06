import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import UserSuggestions from './UserSuggestions';

const store = { accessToken: 'test-token' };
vi.mock('../../store/authStore', () => ({
  useAuthStore: () => store,
}));

const mockData: Record<string, unknown> = {};
vi.mock('swr', () => ({
  default: (key: unknown, _fetcher: unknown) => {
    if (key === null) return { data: undefined, isLoading: false };
    const cached = mockData[key as string];
    return { data: cached ?? null, isLoading: cached === undefined };
  },
}));

vi.mock('./FollowButton', () => ({ default: () => <button>Follow</button> }));
vi.mock('../ui/Skeleton', () => ({ Skeleton: () => <div>skeleton</div> }));
vi.mock('./UserAvatar', () => ({ default: () => <div>avatar</div> }));

const KEY = `${process.env.NEXT_PUBLIC_API_URL}/api/users/suggestions?limit=8`;

describe('UserSuggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.accessToken = 'test-token';
    Object.keys(mockData).forEach((k) => delete mockData[k]);
  });

  it('renders nothing while logged out', () => {
    store.accessToken = null;
    const { container } = render(<UserSuggestions />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when the API returns no users', () => {
    mockData[KEY] = [];
    const { container } = render(<UserSuggestions />);
    expect(container.firstChild).toBeNull();
  });

  it('renders suggested users with avatars and follow buttons', () => {
    mockData[KEY] = [
      { _id: 'u1', name: 'Alice', username: 'alice' },
      { _id: 'u2', name: 'Bob', username: 'bob' },
    ];
    render(<UserSuggestions />);
    expect(screen.getByText('Suggested for you')).toBeTruthy();
    expect(screen.getByText('@alice')).toBeTruthy();
    expect(screen.getByText('@bob')).toBeTruthy();
    expect(screen.getAllByText('Follow').length).toBe(2);
  });
});
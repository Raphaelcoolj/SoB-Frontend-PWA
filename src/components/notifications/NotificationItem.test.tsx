import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotificationItem from './NotificationItem';
import { Notification } from '../../types/notification';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const sender = {
  _id: 'u2',
  name: 'Alice',
  username: 'alice',
  avatar: 'https://cloudinary.test/alice.jpg',
} as Notification['sender'];

const baseNotification = (overrides: Partial<Notification> = {}): Notification => ({
  _id: 'n1',
  recipient: 'u1',
  sender,
  type: 'like',
  isRead: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('NotificationItem media previews', () => {
  it('renders a Mux thumbnail for a video post', () => {
    const notification = baseNotification({
      post: {
        _id: 'p1',
        body: 'Check this video',
        mediaUrls: ['https://stream.mux.com/pb1.m3u8'],
        muxPlaybackId: 'pb1',
      },
    });
    const { container } = render(<NotificationItem notification={notification} />);
    const thumb = container.querySelector('img[alt=""]');
    expect(thumb).toHaveAttribute('src', 'https://image.mux.com/pb1/thumbnail.jpg');
    expect(screen.getByText('Check this video')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/post/p1');
  });

  it('renders the first image URL for an image post', () => {
    const notification = baseNotification({
      post: {
        _id: 'p1',
        title: 'My photo',
        mediaUrls: ['https://cloudinary.test/photo.jpg', 'https://cloudinary.test/photo2.jpg'],
      },
    });
    const { container } = render(<NotificationItem notification={notification} />);
    const thumb = container.querySelector('img[alt=""]');
    expect(thumb).toHaveAttribute('src', 'https://cloudinary.test/photo.jpg');
  });

  it('shows no thumbnail when the post has no media', () => {
    const notification = baseNotification({
      post: { _id: 'p1', title: 'Plain text post' },
    });
    render(<NotificationItem notification={notification} />);
    expect(screen.getByText('Plain text post')).toBeInTheDocument();
    expect(document.querySelector('img[alt=""]')).toBeNull();
  });

  it('follow notifications link to the profile without a preview box', () => {
    const notification = baseNotification({
      type: 'follow',
      post: undefined,
    });
    render(<NotificationItem notification={notification} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/profile/alice');
    expect(screen.getByText('started following you')).toBeInTheDocument();
  });
});

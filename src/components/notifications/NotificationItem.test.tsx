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

  it('renders the poll question as the preview text for a poll-only post', () => {
    const notification = baseNotification({
      post: { _id: 'p1', title: '', body: '', pollQuestion: 'Best framework?' },
    });
    render(<NotificationItem notification={notification} />);
    expect(screen.getByText('Best framework?')).toBeInTheDocument();
    expect(screen.queryByText('View post')).toBeNull();
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

describe('NotificationItem feed reminders', () => {
  it('renders "your feed misses you" with the post count and links home', () => {
    const notification = baseNotification({
      type: 'feed_reminder',
      post: undefined,
      data: { postCount: 3 },
    });
    render(<NotificationItem notification={notification} />);
    expect(screen.getByText('SoB')).toBeInTheDocument();
    expect(screen.getByText('your feed misses you')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('new posts waiting in your feed')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/home');
  });

  it('uses singular copy for a single waiting post', () => {
    const notification = baseNotification({
      type: 'feed_reminder',
      post: undefined,
      data: { postCount: 1 },
    });
    render(<NotificationItem notification={notification} />);
    expect(screen.getByText('new post waiting in your feed')).toBeInTheDocument();
  });
});

describe('NotificationItem comment replies', () => {
  it('shows "replied to your comment" when the comment notification is a reply', () => {
    const notification = baseNotification({
      type: 'comment',
      post: { _id: 'p1', title: 'An article' },
      data: { replyToComment: true },
    });
    render(<NotificationItem notification={notification} />);
    expect(screen.getByText('replied to your comment')).toBeInTheDocument();
  });

  it('shows "commented on your post" for a top-level comment', () => {
    const notification = baseNotification({
      type: 'comment',
      post: { _id: 'p1', title: 'An article' },
      data: null,
    });
    render(<NotificationItem notification={notification} />);
    expect(screen.getByText('commented on your post')).toBeInTheDocument();
  });
});

describe('NotificationItem debate notifications', () => {
  it('deep-links via the server-generated path and shows the proposition', () => {
    const notification = baseNotification({
      type: 'debate_created',
      post: { _id: 'p1', title: 'An article' },
      data: {
        debateId: 'd1',
        proposition: 'Universities should make AI literacy mandatory',
        contentId: 'p1',
        contentType: 'article',
        deepLinkPath: '/post/p1?tab=debate',
        summary: '',
      },
    });
    render(<NotificationItem notification={notification} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/post/p1?tab=debate');
    expect(screen.getByText('started a debate on your post')).toBeInTheDocument();
    expect(screen.getByText(/AI literacy mandatory/)).toBeInTheDocument();
  });

  it('shows an aggregated support count when debate_support carries a count', () => {
    const notification = baseNotification({
      type: 'debate_support',
      post: { _id: 'p1' },
      data: {
        debateId: 'd1',
        proposition: 'Open source is the future',
        contentId: 'p1',
        contentType: 'post',
        argumentId: 'a1',
        deepLinkPath: '/post/p1?tab=debate&argument=a1',
        summary: '',
        count: 3,
      },
    });
    render(<NotificationItem notification={notification} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/post/p1?tab=debate&argument=a1');
    expect(screen.getByText(/supported your argument/)).toBeInTheDocument();
    expect(screen.getByText(/and 2 others/)).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getByText('more supporters on your argument')).toBeInTheDocument();
  });

  it('renders the argument summary for a rebuttal', () => {
    const notification = baseNotification({
      type: 'debate_rebuttal',
      post: { _id: 'p1' },
      data: {
        debateId: 'd1',
        proposition: 'Remote work is better',
        contentId: 'p1',
        contentType: 'article',
        argumentId: 'a2',
        deepLinkPath: '/post/p1?tab=debate&argument=a2',
        summary: 'Actually, focus time drops 30% at home.',
      },
    });
    render(<NotificationItem notification={notification} />);
    expect(screen.getByText(/Actually, focus time drops 30% at home/)).toBeInTheDocument();
    expect(screen.getByText('rebutted your argument')).toBeInTheDocument();
  });

  it('renders argument_created notification with summary', () => {
    const notification = baseNotification({
      type: 'argument_created',
      post: { _id: 'p1' },
      data: {
        debateId: 'd1',
        proposition: 'Universities should make AI literacy mandatory',
        contentId: 'p1',
        contentType: 'article',
        argumentId: 'a3',
        deepLinkPath: '/post/p1?tab=debate&argument=a3',
        summary: 'AI literacy is a public good that benefits all students.',
      },
    });
    render(<NotificationItem notification={notification} />);
    expect(screen.getByText(/AI literacy is a public good/)).toBeInTheDocument();
    expect(screen.getByText('made an argument on your debate')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/post/p1?tab=debate&argument=a3');
  });
});

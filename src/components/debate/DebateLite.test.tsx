import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DebateLite from './DebateLite';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const { getDebatesByContent, getArguments } = vi.hoisted(() => ({
  getDebatesByContent: vi.fn(),
  getArguments: vi.fn(),
}));

vi.mock('../../services/debate', () => ({ getDebatesByContent, getArguments }));
vi.mock('../../lib/analytics', () => ({ track: vi.fn() }));

const openDebate = {
  _id: 'd1',
  contentId: 'p1',
  contentType: 'post',
  proposition: 'Remote work reduces creativity',
  status: 'OPEN',
  creator: 'u1',
  closingDate: null,
  summary: '',
  argumentCount: 2,
  forCount: 3,
  againstCount: 1,
  views: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  stats: { forCount: 3, againstCount: 1, argumentCount: 2, forPct: 75, againstPct: 25 },
};

const arg = (id: string, side: 'FOR' | 'AGAINST', body: string) => ({
  _id: id,
  debate: 'd1',
  author: { _id: 'u9', name: 'Alex', username: 'alex' },
  side,
  body,
  evidence: null,
  parentArgument: null,
  rebuttalCount: 0,
  supportsCount: 0,
  downvotesCount: 0,
  score: 0,
  isSupported: false,
  isDownvoted: false,
  editedAt: null,
  moderationStatus: 'active',
  views: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

beforeEach(() => {
  getDebatesByContent.mockReset();
  getArguments.mockReset();
});

describe('DebateLite', () => {
  it('shows a CTA to start or join a debate when none exists', async () => {
    getDebatesByContent.mockResolvedValue([]);
    render(<DebateLite postId="p1" />);
    const cta = await screen.findByRole('link', { name: /Start or join a debate/ });
    expect(cta).toHaveAttribute('href', '/post/p1?tab=debate');
  });

  it('renders the active debate with a live split and recent arguments', async () => {
    getDebatesByContent.mockResolvedValue([openDebate]);
    getArguments.mockImplementation((_debateId: string, params: { side: string }) => {
      const list = params.side === 'FOR' ? [arg('a1', 'FOR', 'Time zones kill the brainwave')] : [arg('a2', 'AGAINST', 'Home offices boost focus')];
      return Promise.resolve({ arguments: list, pagination: { total: list.length, page: 1, limit: 2, pages: 1 } });
    });

    render(<DebateLite postId="p1" />);

    expect(await screen.findByText('Remote work reduces creativity')).toBeInTheDocument();
    expect(screen.getByText('FOR 75%')).toBeInTheDocument();
    expect(screen.getByText('AGAINST 25%')).toBeInTheDocument();
    expect(screen.getByText(/Time zones kill the brainwave/)).toBeInTheDocument();
    expect(screen.getByText(/Home offices boost focus/)).toBeInTheDocument();

    const cta = screen.getByRole('link', { name: /Make an argument/ });
    expect(cta).toHaveAttribute('href', '/post/p1?tab=debate');
  });

  it('falls back to a closed debate when no debate is OPEN', async () => {
    getDebatesByContent.mockResolvedValue([{ ...openDebate, status: 'CLOSED' }]);
    getArguments.mockResolvedValue({ arguments: [], pagination: { total: 0, page: 1, limit: 2, pages: 0 } });

    render(<DebateLite postId="p1" />);
    expect(await screen.findByText('Remote work reduces creativity')).toBeInTheDocument();
    expect(screen.getByText('CLOSED')).toBeInTheDocument();
  });

  it('still links into the debate view when the API fails', async () => {
    getDebatesByContent.mockRejectedValue(new Error('network'));
    render(<DebateLite postId="p1" />);
    const cta = await screen.findByRole('link', { name: /Start or join a debate/ });
    expect(cta).toHaveAttribute('href', '/post/p1?tab=debate');
  });
});

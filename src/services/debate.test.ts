import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchWithAuth } from '../lib/api';
import {
  createDebate,
  getDebatesByContent,
  createArgument,
  getArguments,
  toggleSupport,
  reportDebate,
} from './debate';

vi.mock('../lib/api', () => ({
  fetchWithAuth: vi.fn(),
}));

const mockFetchWithAuth = vi.mocked(fetchWithAuth);

const jsonResponse = (data: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data }) }) as unknown as Response;

const debate = {
  _id: 'd1',
  contentId: 'p1',
  contentType: 'article',
  proposition: 'AI literacy should be mandatory',
  status: 'OPEN',
  creator: 'u1',
  closingDate: null,
  summary: '',
  argumentCount: 0,
  forCount: 0,
  againstCount: 0,
  views: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  stats: { forCount: 0, againstCount: 0, argumentCount: 0, forPct: 50, againstPct: 50 },
};

beforeEach(() => {
  mockFetchWithAuth.mockReset();
});

describe('debate service', () => {
  it('createDebate POSTs to /api/debates and returns the created debate', async () => {
    mockFetchWithAuth.mockResolvedValue(jsonResponse({ debate }));
    const created = await createDebate({ contentId: 'p1', contentType: 'article', proposition: 'AI literacy should be mandatory' });
    expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/debates', {
      method: 'POST',
      body: JSON.stringify({
        contentId: 'p1',
        contentType: 'article',
        proposition: 'AI literacy should be mandatory',
      }),
    });
    expect(created).toEqual(debate);
  });

  it('getDebatesByContent GETs /api/debates/by-content/:id and unwraps the list', async () => {
    mockFetchWithAuth.mockResolvedValue(jsonResponse({ debates: [debate] }));
    const list = await getDebatesByContent('p1');
    expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/debates/by-content/p1');
    expect(list).toEqual([debate]);
  });

  it('getArguments appends the side/page/limit query string', async () => {
    mockFetchWithAuth.mockResolvedValue(jsonResponse({ arguments: [], pagination: { total: 0, page: 1, limit: 10, pages: 0 } }));
    await getArguments('d1', { side: 'FOR', page: 2, limit: 10 });
    expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/debates/d1/arguments?side=FOR&page=2&limit=10');
  });

  it('createArgument POSTs side/body/evidence to the debate arguments endpoint', async () => {
    mockFetchWithAuth.mockResolvedValue(jsonResponse({ argument: {} }));
    await createArgument('d1', {
      side: 'AGAINST',
      body: 'It would cost too much.',
      evidence: { url: 'https://example.com/study' },
    });
    expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/debates/d1/arguments', {
      method: 'POST',
      body: JSON.stringify({ side: 'AGAINST', body: 'It would cost too much.', evidence: { url: 'https://example.com/study' } }),
    });
  });

  it('toggleSupport POSTs the argument support endpoint', async () => {
    mockFetchWithAuth.mockResolvedValue(jsonResponse({ supportsCount: 1, downvotesCount: 0, isSupported: true, isDownvoted: false }));
    const result = await toggleSupport('a1');
    expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/debates/arguments/a1/support', { method: 'POST', body: '{}' });
    expect(result.isSupported).toBe(true);
  });

  it('reportDebate POSTs to the debate report endpoint', async () => {
    mockFetchWithAuth.mockResolvedValue(jsonResponse({ message: 'Reported' }));
    await reportDebate('d1', 'spam');
    expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/debates/report', {
      method: 'POST',
      body: JSON.stringify({ debateId: 'd1', reason: 'spam', description: undefined }),
    });
  });
});

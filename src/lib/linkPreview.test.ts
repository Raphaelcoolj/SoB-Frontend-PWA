import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractUrl, getLinkPreview } from './linkPreview';

vi.mock('./api', () => ({
  fetchWithAuth: vi.fn(),
}));

const { fetchWithAuth } = await import('./api');

const okResponse = (data: unknown) =>
  ({ ok: true, json: async () => ({ data }) }) as unknown as Response;

describe('extractUrl', () => {
  it('extracts https URLs from free text', () => {
    expect(extractUrl('see https://example.com/path now')).toBe('https://example.com/path');
  });

  it('extracts http URLs', () => {
    expect(extractUrl('http://example.com')).toBe('http://example.com/');
  });

  it('normalizes bare www links to https', () => {
    expect(extractUrl('visit www.example.com today')).toBe('https://www.example.com/');
  });

  it('detects bare domains without a protocol', () => {
    expect(extractUrl('visit example.com/blog today')).toBe('https://example.com/blog');
  });

  it('does not match decimals or abbreviations as links', () => {
    expect(extractUrl('score 3.5 stars')).toBeNull();
    expect(extractUrl('e.g. something')).toBeNull();
  });

  it('strips trailing sentence punctuation', () => {
    expect(extractUrl('go to https://example.com. now')).toBe('https://example.com/');
    expect(extractUrl('see https://example.com)')).toBe('https://example.com/');
  });

  it('keeps query strings and trailing paths', () => {
    expect(extractUrl('https://example.com/a?b=c&d=1')).toBe('https://example.com/a?b=c&d=1');
  });

  it('returns null when there is no URL', () => {
    expect(extractUrl('just some words')).toBeNull();
    expect(extractUrl('')).toBeNull();
  });

  it('returns null for an invalid URL', () => {
    expect(extractUrl('http://')).toBeNull();
  });
});

describe('getLinkPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches preview metadata from the backend', async () => {
    const data = { url: 'https://example.com/', domain: 'example.com', title: 'T', description: 'D' };
    (fetchWithAuth as any).mockResolvedValue(okResponse(data));
    await expect(getLinkPreview('https://example.com/')).resolves.toEqual(data);
    expect(fetchWithAuth).toHaveBeenCalledWith('/api/link-preview?url=https%3A%2F%2Fexample.com%2F');
  });

  it('returns null when the response is not ok', async () => {
    (fetchWithAuth as any).mockResolvedValue({ ok: false });
    await expect(getLinkPreview('https://example.com/x')).resolves.toBeNull();
  });

  it('returns null on network error', async () => {
    (fetchWithAuth as any).mockRejectedValue(new Error('nope'));
    await expect(getLinkPreview('https://example.com/y')).resolves.toBeNull();
  });

  it('dedupes concurrent requests for the same URL', async () => {
    (fetchWithAuth as any).mockResolvedValue(okResponse({ url: 'https://example.com/d', domain: 'example.com' }));
    await Promise.all([getLinkPreview('https://example.com/d'), getLinkPreview('https://example.com/d')]);
    expect(fetchWithAuth).toHaveBeenCalledTimes(1);
  });

  it('caches subsequent calls for the same URL', async () => {
    (fetchWithAuth as any).mockResolvedValue(okResponse({ url: 'https://example.com/c', domain: 'example.com' }));
    await getLinkPreview('https://example.com/c');
    (fetchWithAuth as any).mockClear();
    await expect(getLinkPreview('https://example.com/c')).resolves.toEqual({
      url: 'https://example.com/c',
      domain: 'example.com',
    });
    expect(fetchWithAuth).not.toHaveBeenCalled();
  });
});

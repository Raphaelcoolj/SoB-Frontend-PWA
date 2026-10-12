import { describe, it, expect, vi, afterEach } from 'vitest';
import { isGifUrl, extractGifUrls, stripGifUrls, fetchGifFile } from './gif';

describe('isGifUrl', () => {
  it('detects plain http(s) .gif URLs', () => {
    expect(isGifUrl('https://media.giphy.com/media/abc123/giphy.gif')).toBe(true);
    expect(isGifUrl('http://example.com/pic.GIF')).toBe(true);
  });

  it('ignores query strings and hashes', () => {
    expect(isGifUrl('https://cdn.example.com/a.gif?w=200')).toBe(true);
    expect(isGifUrl('https://cdn.example.com/a.gif#frame')).toBe(true);
  });

  it('rejects non-gif URLs and empty input', () => {
    expect(isGifUrl('https://cdn.example.com/a.jpg')).toBe(false);
    expect(isGifUrl('https://cdn.example.com/a.gif.jpg')).toBe(false);
    expect(isGifUrl('')).toBe(false);
    expect(isGifUrl(null)).toBe(false);
    expect(isGifUrl(undefined)).toBe(false);
  });
});

describe('extractGifUrls', () => {
  it('returns every gif URL in order', () => {
    const text = 'check https://cdn.example.com/one.gif and https://cdn.example.com/two.gif ok';
    expect(extractGifUrls(text)).toEqual([
      'https://cdn.example.com/one.gif',
      'https://cdn.example.com/two.gif',
    ]);
  });

  it('returns an empty array when there are none', () => {
    expect(extractGifUrls('no animations here https://example.com/pic.jpg')).toEqual([]);
    expect(extractGifUrls('')).toEqual([]);
  });
});

describe('stripGifUrls', () => {
  it('removes gif URLs and collapses the leftover spaces', () => {
    expect(stripGifUrls('lol https://cdn.example.com/joy.gif')).toBe('lol');
    expect(stripGifUrls('https://cdn.example.com/joy.gif')).toBe('');
  });

  it('keeps surrounding words and intentional newlines', () => {
    expect(stripGifUrls('first\nhttps://cdn.example.com/a.gif\nsecond')).toBe('first\nsecond');
  });

  it('leaves text without gif URLs untouched (paragraph breaks intact)', () => {
    const withParagraphs = 'first\n\nsecond https://example.com/a.jpg';
    expect(stripGifUrls(withParagraphs)).toBe(withParagraphs);
  });
});

describe('fetchGifFile', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('downloads the GIF and wraps it as an image/gif File', async () => {
    const blob = new Blob([new Uint8Array([0x47, 0x49, 0x46, 0x38])], { type: 'image/gif' });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => blob }),
    );

    const file = await fetchGifFile('https://cdn.example.com/a.gif', 'abc/123');
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe('abc123.gif');
    expect(file.type).toBe('image/gif');
    expect(file.size).toBe(4);
  });

  it('throws on a non-200 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, blob: async () => new Blob([]) }),
    );
    await expect(fetchGifFile('https://cdn.example.com/missing.gif')).rejects.toThrow(
      'GIF download failed (HTTP 404)',
    );
  });
});

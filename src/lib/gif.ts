/**
 * @file gif.ts
 * @description GIF helpers shared by the PWA chat, comment, and debate
 * surfaces — mirrors the native app's `src/utils/gif.ts`.
 *
 * - `isGifUrl` detects animation-capable image URLs (query/hash-safe).
 * - `extractGifUrls` / `stripGifUrls` implement the "GIF travels as a URL in
 *   text" convention: comments/debates are text-only on the backend, so the
 *   picker appends the GIF URL to the body; renderers strip the URL from the
 *   text and show the GIF inline instead.
 * - `fetchGifFile` turns a remote GIF into an uploadable `File` so the chat
 *   composer can send it through the normal multipart image pipeline.
 */

export interface GifResult {
  id: string;
  title: string;
  previewUrl: string;
  previewWidth: number;
  previewHeight: number;
  url: string;
  width: number;
  height: number;
}

/** Matches http(s) URLs ending in .gif (optional query/hash). */
const GIF_URL_REGEX = /https?:\/\/[^\s<>"'()\]]+?\.gif(\?[^\s<>"'()\]]*)?(#[^\s<>"'()\]]*)?/gi;

export function isGifUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.split(/[?#]/)[0].toLowerCase();
  return clean.endsWith('.gif') || clean.includes('giphy.com') || clean.includes('/gif');
}

/** All GIF URLs found in a text body, in order of appearance. */
export function extractGifUrls(text: string): string[] {
  if (!text) return [];
  return text.match(GIF_URL_REGEX) ?? [];
}

/**
 * Remove GIF URLs from a text body (for rendering the remainder as text
 * beside the inline GIF). A URL that sat on its own line takes that line
 * break with it (no leftover blank line); an inline URL takes one adjacent
 * space run. Text without GIF URLs is returned untouched, so intentional
 * paragraph breaks in normal comments are never reflowed.
 */
export function stripGifUrls(text: string): string {
  if (!text) return '';
  const src = GIF_URL_REGEX.source;
  return text
    // URL preceded by a line break: drop the break it rode in on.
    .replace(new RegExp(`[ \\t]*\\n[ \\t]*${src}[ \\t]*`, 'gi'), '')
    // URL followed by a line break (start-of-text case): drop that break too.
    .replace(new RegExp(`${src}[ \\t]*\\n[ \\t]*`, 'gi'), '')
    // Inline URL: remove it plus one adjacent space run (replaced by a
    // single space so surrounding words never glue together).
    .replace(new RegExp(`[ \\t]*${src}[ \\t]*`, 'gi'), ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Download a remote GIF and wrap it as a `File` for the chat multipart
 * upload. Giphy's media CDN sends permissive CORS headers so a plain fetch
 * works from the browser.
 */
export async function fetchGifFile(url: string, idHint = 'gif'): Promise<File> {
  const res = await fetch(url, { referrerPolicy: 'no-referrer', mode: 'cors' });
  if (!res.ok) throw new Error(`GIF download failed (HTTP ${res.status})`);
  const blob = await res.blob();
  const safeHint = idHint.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) || 'gif';
  return new File([blob], `${safeHint}.gif`, { type: 'image/gif' });
}

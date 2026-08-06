/**
 * @file linkPreview.ts
 * @description Client-side link-preview helpers. Extracts the first URL from
 * user text and fetches OpenGraph metadata from the backend (`GET
 * /api/link-preview`) with an in-memory per-URL cache + in-flight dedupe so a
 * unique link only ever triggers one network request per session.
 */

import { fetchWithAuth } from './api';

export interface LinkPreviewData {
  url: string;
  title: string;
  description: string;
  image?: string;
  siteName?: string;
  domain: string;
}

const URL_REGEX =
  /(?:https?:\/\/|www\.)[^\s<>"'）]+|(?<![A-Za-z0-9])[A-Za-z0-9][A-Za-z0-9-]*\.[A-Za-z]{2,}(?::\d+)?(?:[^\s<>"'）]*)?/gi;

/**
 * Return the first URL found in free text, or null. Detects `http(s)://`,
 * bare `www.` links and bare domains (`example.com/blog`) but avoids things
 * like `3.5` or `e.g`. Strips trailing sentence punctuation and normalizes
 * scheme-less links to `https://`.
 */
export const extractUrl = (text: string): string | null => {
  if (!text) return null;
  const match = text.match(URL_REGEX);
  if (!match) return null;

  let raw = match[0].trim();
  raw = raw.replace(/[)\]}>"']+$/, '').replace(/[.,;:!]+$/, '').replace(/&+$/, '');
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;

  try {
    return new URL(raw).toString();
  } catch {
    return null;
  }
};

const cache = new Map<string, LinkPreviewData | null>();
const inflight = new Map<string, Promise<LinkPreviewData | null>>();

/**
 * Fetch preview metadata for a URL. Returns null on any failure (network,
 * non-HTML target, blocked host) so callers can degrade to a plain link chip.
 */
export const getLinkPreview = async (url: string): Promise<LinkPreviewData | null> => {
  if (cache.has(url)) return cache.get(url) ?? null;
  if (inflight.has(url)) return inflight.get(url) ?? null;

  const request = (async () => {
    try {
      const res = await fetchWithAuth(`/api/link-preview?url=${encodeURIComponent(url)}`);
      if (!res.ok) return null;
      const body = await res.json();
      return (body?.data as LinkPreviewData) ?? null;
    } catch {
      return null;
    }
  })().finally(() => inflight.delete(url));

  inflight.set(url, request);
  const data = await request;
  cache.set(url, data);
  return data;
};

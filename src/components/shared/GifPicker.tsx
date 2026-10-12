'use client';

/**
 * @file GifPicker.tsx
 * @description GIF search & pick dialog backed by the backend Giphy proxy
 * (`GET /api/giphy/search`). Shows trending GIFs for an empty query, debounced
 * live search as you type, a responsive aspect-aware grid, and infinite scroll.
 * Used by the chat attach menu, the comment composer, and the debate argument
 * composers (where a picked GIF becomes the evidence URL or body URL).
 *
 * Selecting a GIF returns the full-size (`url`) rendition to the caller.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '../../lib/api';
import { GifResult } from '../../lib/gif';

const PAGE_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 350;

interface GifPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (gif: GifResult) => void;
}

interface GiphyEnvelope {
  gifs?: GifResult[];
  pagination?: { offset?: number; limit?: number; count?: number };
}

export default function GifPicker({ open, onClose, onSelect }: GifPickerProps) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const offsetRef = useRef(0);
  const generationRef = useRef(0);
  const activeQueryRef = useRef('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadPage = useCallback(
    async (q: string, offset: number, append: boolean) => {
      const generation = ++generationRef.current;
      activeQueryRef.current = q;
      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setError(null);
      }
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set('q', q.trim());
        params.set('limit', String(PAGE_LIMIT));
        params.set('offset', String(offset));
        const res = await fetchWithAuth(`/api/giphy/search?${params.toString()}`);
        const json = await res.json().catch(() => null);
        if (generation !== generationRef.current) return;
        if (!res.ok || !json) {
          setError(json?.message || 'Could not load GIFs');
          if (!append) setGifs([]);
          setHasMore(false);
          return;
        }
        const envelope: GiphyEnvelope = json?.data ?? json ?? {};
        const page: GifResult[] = Array.isArray(envelope.gifs) ? envelope.gifs : [];
        const count = envelope.pagination?.count ?? page.length;
        const pageLimit = envelope.pagination?.limit ?? PAGE_LIMIT;
        const pageOffset = envelope.pagination?.offset ?? offset;
        setGifs((prev) => (append ? [...prev, ...page] : page));
        offsetRef.current = pageOffset + pageLimit;
        setHasMore(count >= pageLimit && page.length > 0);
      } catch {
        if (generation !== generationRef.current) return;
        setError('Could not load GIFs');
        if (!append) setGifs([]);
        setHasMore(false);
      } finally {
        if (generation === generationRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  // Reset + load trending whenever the picker opens. The state resets are
  // deferred to a 0ms timer so they never run synchronously in the effect
  // body (react-hooks/set-state-in-effect) — mirrors the PostClient pattern.
  useEffect(() => {
    if (!open) return;
    const reset = window.setTimeout(() => {
      setQuery('');
      setGifs([]);
      setError(null);
      setHasMore(false);
      offsetRef.current = 0;
      loadPage('', 0, false);
    }, 0);
    const focus = setTimeout(() => inputRef.current?.focus(), 100);
    return () => {
      window.clearTimeout(reset);
      clearTimeout(focus);
    };
  }, [open, loadPage]);

  // Debounced search as the user types.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q === activeQueryRef.current.trim()) return;
    const t = setTimeout(() => {
      offsetRef.current = 0;
      loadPage(q, 0, false);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, open, loadPage]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !hasMore || loading || loadingMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
      loadPage(activeQueryRef.current, offsetRef.current, true);
    }
  }, [hasMore, loading, loadingMore, loadPage]);

  const handleSelect = useCallback(
    (gif: GifResult) => {
      onSelect(gif);
      onClose();
    },
    [onSelect, onClose],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Pick a GIF"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-auto bg-card border border-border/60 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[75vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 p-3 border-b border-border">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-muted">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search GIFs..."
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              aria-label="Search GIFs"
            />
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close GIF picker"
            data-testid="gif-picker-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : error ? (
            <div className="text-center py-10 space-y-3">
              <p className="text-sm text-destructive">{error}</p>
              <button
                onClick={() => loadPage(activeQueryRef.current, 0, false)}
                className="text-xs font-bold text-accent hover:underline"
                data-testid="gif-retry"
              >
                Tap to retry
              </button>
            </div>
          ) : gifs.length === 0 ? (
            <p className="text-center py-12 text-sm text-muted-foreground">
              No GIFs found for “{query.trim()}”
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {gifs.map((gif) => (
                  <button
                    key={gif.id}
                    onClick={() => handleSelect(gif)}
                    className="relative rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-accent transition-all aspect-[4/3] cursor-pointer"
                    title={gif.title || 'GIF'}
                    data-testid={`gif-result-${gif.id}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={gif.previewUrl}
                      alt={gif.title || 'GIF'}
                      loading="lazy"
                      referrerPolicy="no-referrer" crossOrigin="anonymous" className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
              {loadingMore && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-accent" />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Convenience wrapper mirroring the native composer's GIF pill button. */
export function GifButton({
  onClick,
  disabled,
  testId,
  label = 'Add GIF',
}: {
  onClick: () => void;
  disabled?: boolean;
  testId?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-2.5 py-1 rounded-lg border border-border text-[10px] font-extrabold tracking-wide text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
      aria-label={label}
      data-testid={testId}
    >
      GIF
    </button>
  );
}

/** Append a picked GIF URL to composer text (single trailing space). */
export function appendGifUrl(current: string, url: string): string {
  const trimmed = current.trim();
  return trimmed ? `${trimmed} ${url}` : url;
}

/** Surface a fetch/pick failure without throwing to the caller's UI path. */
export function gifPickFailed(err: unknown): void {
  toast.error(err instanceof Error ? err.message : 'Could not add GIF. Please try again.');
}

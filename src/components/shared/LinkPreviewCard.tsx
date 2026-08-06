'use client';

/**
 * @file LinkPreviewCard.tsx
 * @description Detects the first URL in free text and renders an unfurl card
 * with the link's title, description and thumbnail (fetched from
 * `GET /api/link-preview` via the client cache in `lib/linkPreview`). Falls
 * back to a plain clickable domain chip when the preview can't be fetched.
 * `mine` themes the card for use inside own chat bubbles; the whole card opens
 * the URL in a new tab.
 */

import React, { memo, useEffect, useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { extractUrl, getLinkPreview, LinkPreviewData } from '../../lib/linkPreview';

interface LinkPreviewCardProps {
  /** Free text that may contain a URL. */
  text: string;
  /** Render in "own bubble" colours (white on translucent white). */
  mine?: boolean;
  className?: string;
}

const domainOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

function LinkPreviewCardInner({ text, mine = false, className = '' }: LinkPreviewCardProps) {
  const url = useMemo(() => extractUrl(text), [text]);
  const [data, setData] = useState<LinkPreviewData | null | undefined>(undefined);

  useEffect(() => {
    if (!url) return;
    let active = true;
    getLinkPreview(url).then((d) => {
      if (active) setData(d);
    });
    return () => {
      active = false;
    };
  }, [url]);

  const container = `block w-full overflow-hidden rounded-lg border text-left transition-colors ${className} ${
    mine
      ? 'bg-white/15 border-white/25 hover:bg-white/20'
      : 'bg-card border-border hover:border-accent/50'
  }`;

  if (!url) return null;

  const open = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (data === undefined) {
    return (
      <div className={`${container} cursor-default`}>
        <div className="flex items-center gap-2 p-2.5">
          <span
            className={`w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin ${
              mine ? 'border-white/50' : 'border-accent/50'
            }`}
          />
          <span className={`text-[11px] ${mine ? 'text-white/60' : 'text-muted-foreground'}`}>
            Loading preview…
          </span>
        </div>
      </div>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" onClick={open} className={container}>
      <div className="flex items-stretch">
        {data?.image && (
          <div className="w-16 sm:w-20 flex-shrink-0 overflow-hidden bg-foreground/5">
            <img
              src={data.image}
              alt=""
              loading="lazy"
              className="w-full h-full min-h-[64px] object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
        <div className="flex-1 min-w-0 p-2.5">
          {data?.title && (
            <p
              className={`text-xs font-semibold leading-snug line-clamp-2 ${
                mine ? 'text-white' : 'text-foreground'
              }`}
            >
              {data.title}
            </p>
          )}
          {data?.description && (
            <p
              className={`text-[11px] leading-snug line-clamp-2 mt-0.5 ${
                mine ? 'text-white/75' : 'text-muted-foreground'
              }`}
            >
              {data.description}
            </p>
          )}
          <p
            className={`flex items-center gap-1 text-[10px] uppercase tracking-wide mt-1 truncate ${
              mine ? 'text-white/55' : 'text-muted-foreground/80'
            }`}
          >
            {data ? data.siteName || data.domain : domainOf(url)}
            <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
          </p>
        </div>
      </div>
    </a>
  );
}

export default memo(LinkPreviewCardInner);

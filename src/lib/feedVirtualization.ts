import type { CSSProperties } from 'react';

/**
 * Rendering style that lets the browser skip layout and paint for feed cards
 * that are scrolled out of view (`content-visibility: auto`), so a long feed
 * stops paying for content the reader cannot see — without pulling in a
 * virtualisation dependency.
 *
 * `contain-intrinsic-size: auto <fallback>` reserves a plausible box until the
 * card has been rendered once, after which the browser remembers the real size,
 * which keeps the scrollbar stable while scrolling back into unseen content.
 *
 * Cards with an open overlay opt out: paint containment would clip the
 * fixed-position lightbox / report layers they render inline.
 */
export function feedCardVirtualization(overlayOpen: boolean): CSSProperties | undefined {
  if (overlayOpen) return undefined;
  return {
    contentVisibility: 'auto',
    containIntrinsicSize: 'auto 700px',
  } as CSSProperties;
}

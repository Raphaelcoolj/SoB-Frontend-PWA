'use client';

/**
 * @file FeedImage.tsx
 * @description Feed thumbnail image with Cloudinary transform + shimmer placeholder.
 * Applies a `w_400,c_fill,f_auto,q_auto` transform to Cloudinary URLs so feed
 * thumbnails load at reduced resolution (lightbox/detail still uses full URL).
 * Shows a shimmer skeleton while the image is loading instead of a blank box.
 */

import { useState } from 'react';

const getFeedImageUrl = (url: string, width = 400) =>
  url.includes('/upload/')
    ? url.replace('/upload/', `/upload/w_${width},c_fill,f_auto,q_auto/`)
    : url;

interface FeedImageProps {
  src: string;
  alt?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  /** Delivery width (px) for the Cloudinary transform. Defaults to 400. */
  width?: number;
}

export default function FeedImage({ src, alt = '', className = '', loading = 'lazy', width = 400 }: FeedImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden ${loaded ? '' : 'shimmer'} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getFeedImageUrl(src, width)}
        alt={alt}
        loading={loading}
        decoding="async"
        fetchPriority={loading === 'eager' ? 'high' : 'auto'}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className="w-full h-full object-cover"
      />
      <style jsx>{`
        .shimmer {
          background-color: var(--color-muted, #e4e4e7);
        }
        .shimmer::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent);
          transform: translateX(-100%);
          animation: shimmer-sweep 1.4s ease infinite;
        }
        @keyframes shimmer-sweep {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}

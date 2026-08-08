'use client';

/**
 * @file HomepageShowcase.tsx
 * @description Live product showcase for the public homepage.
 * Fetches the public homepage aggregate once, refreshes every 60s, and renders
 * real SoB content with loading / error / empty states per section.
 */

import React from 'react';
import { useHomepage } from '../../hooks/useHomepage';
import type { HomepageData } from '../../types/homepage';
import ProductPreview from './ProductPreview';
import WhatsHappening from './WhatsHappening';
import TrendingDiscussions from './TrendingDiscussions';
import SuggestedUsers from './SuggestedUsers';

interface HomepageShowcaseProps {
  /** Data fetched during SSR/ISR, used as SWR fallbackData for instant hydration. */
  initialData?: HomepageData | null;
  /** True when the server-side fetch failed (ISR fallback) — unavailable states show in initial HTML. */
  serverFailed?: boolean;
}

export default function HomepageShowcase({ initialData, serverFailed }: HomepageShowcaseProps) {
  const { data, error } = useHomepage(initialData ?? undefined);
  // SWR's `isLoading` bypasses fallbackData (it means "no cached data"), so gate
  // skeletons on the absence of data itself: server-rendered content hydrates
  // instantly instead of flashing the loading state.
  const loading = !data;
  // Show the unavailable state only when we have nothing to display yet;
  // a failed background refresh keeps the last good payload on screen.
  const hasError = (Boolean(error) && !data) || (Boolean(serverFailed) && !initialData);
  const posts = data?.posts ?? [];

  return (
    <>
      {loading && (
        <p role="status" className="sr-only">
          Loading live SoB content…
        </p>
      )}
      <ProductPreview post={posts[0] ?? null} isLoading={loading} hasError={hasError} />
      <WhatsHappening
        topics={data?.topics ?? []}
        posts={posts.slice(1)}
        isLoading={loading}
        hasError={hasError}
      />
      <TrendingDiscussions discussions={data?.discussions ?? []} isLoading={loading} hasError={hasError} />
      <SuggestedUsers users={data?.users ?? []} isLoading={loading} hasError={hasError} />
    </>
  );
}

'use client';

/**
 * @file page.tsx (digest/[id])
 * @description Weekly Digest detail page.
 *
 * Opens when a user taps the "SoB your weekly digest is ready" notification.
 * Loads the specific digest by notification ID so an old notification always
 * opens its own week's data, not the latest digest.
 *
 * Security: the backend GET /api/notifications/:id enforces ownership —
 * a user cannot read another user's digest by guessing the ID.
 *
 * Error handling: invalid/missing/unauthorized IDs show a focused error state.
 * No redirect to `/`.
 */

import React from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { use } from 'react';
import { ArrowLeft, Calendar, TrendingUp, Users, Trophy, AlertCircle } from 'lucide-react';
import { fetchWithAuth } from '../../../../lib/api';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { formatDistanceToNow } from '../../../../lib/utils';
import { Notification, WeeklyDigestData } from '../../../../types/notification';

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

const fetcher = (url: string) =>
  fetchWithAuth(url)
    .then((r) => {
      if (r.status === 403) throw Object.assign(new Error('forbidden'), { status: 403 });
      if (r.status === 404) throw Object.assign(new Error('not_found'), { status: 404 });
      if (!r.ok) throw Object.assign(new Error('error'), { status: r.status });
      return r.json();
    })
    .then((d) => d.data);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a human-readable week label derived from the notification createdAt. */
function weekLabel(createdAt: string): string {
  const end = new Date(createdAt);
  const start = new Date(end);
  start.setDate(start.getDate() - 7);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${fmt(start)} – ${fmt(end)}`;
}

/** Returns the displayable post heading: title if available, else bodyPreview. */
function postHeading(topPost: NonNullable<WeeklyDigestData['topPost']>): string {
  return topPost.title || topPost.bodyPreview || '';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-4 pt-2 pb-20">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />
    </div>
  );
}

function ErrorState({ status }: { status?: number }) {
  const isForbidden = status === 403;
  const message = isForbidden
    ? "You don't have permission to view this digest."
    : 'This digest could not be found. It may have expired (digests are kept for 30 days).';

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 animate-in fade-in duration-500">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
        <AlertCircle className="w-7 h-7 text-muted-foreground" />
      </div>
      <div className="space-y-1 max-w-xs">
        <h2 className="font-semibold text-foreground">Digest unavailable</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
      </div>
      <Link href="/notifications" className="text-sm font-medium text-accent hover:underline">
        Back to notifications
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DigestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data, isLoading, error } = useSWR(
    id ? `/api/notifications/${id}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const backLink = (
    <Link
      href="/notifications"
      className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm font-semibold transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      Notifications
    </Link>
  );

  if (isLoading) {
    return (
      <div className="space-y-4 pt-4 pb-20">
        {backLink}
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-4 pb-20">
        {backLink}
        <ErrorState status={(error as any).status} />
      </div>
    );
  }

  const notification = data?.notification as Notification | undefined;

  if (!notification || notification.type !== 'weekly_digest') {
    return (
      <div className="pt-4 pb-20">
        {backLink}
        <ErrorState status={404} />
      </div>
    );
  }

  const digest = notification.data as WeeklyDigestData | null;

  // The populated post ObjectId ref — used to build the link to the full post.
  const topPostRef = notification.post;

  // Only show field rankings that have a real field name resolved.
  const validRankings = (digest?.fieldRankings ?? []).filter((r) => r.field?.name);

  const heading = digest?.topPost ? postHeading(digest.topPost) : null;

  return (
    <div className="space-y-5 pt-4 pb-20 animate-in fade-in duration-300">
      {backLink}

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
          <Calendar className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h1 className="text-base font-bold text-foreground leading-tight">
            Your Weekly Digest
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {weekLabel(notification.createdAt)}
          </p>
        </div>
      </div>

      {/* ── Top Post ───────────────────────────────────────────────── */}
      {digest?.topPost && heading && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent flex-shrink-0" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-accent">
              Top Post This Week
            </span>
          </div>

          {/* Link to full post via the existing post detail route */}
          {topPostRef?._id ? (
            <Link
              href={`/post/${topPostRef._id}`}
              className="block px-4 pb-4 pt-2 hover:bg-muted/30 transition-colors group"
            >
              <p className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors line-clamp-3 leading-snug">
                {heading}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-muted-foreground">
                  {digest.topPost.views.toLocaleString()} views
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {digest.topPost.likes.toLocaleString()} likes
                </span>
              </div>
            </Link>
          ) : (
            <div className="px-4 pb-4 pt-2">
              <p className="text-sm font-semibold text-foreground line-clamp-3 leading-snug">
                {heading}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-muted-foreground">
                  {digest.topPost.views.toLocaleString()} views
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {digest.topPost.likes.toLocaleString()} likes
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Followers Gained ───────────────────────────────────────── */}
      {(digest?.followersGained ?? 0) > 0 && (
        <div className="bg-card border border-border rounded-2xl px-4 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground leading-none">
              +{digest!.followersGained.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              new follower{digest!.followersGained === 1 ? '' : 's'} this week
            </p>
          </div>
        </div>
      )}

      {/* ── Field Rankings ─────────────────────────────────────────── */}
      {validRankings.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-1 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-accent flex-shrink-0" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-accent">
              Field Rankings
            </span>
          </div>
          <ul className="divide-y divide-border/50">
            {validRankings.map((r, i) => (
              <li key={i} className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-foreground font-medium">
                  {r.field.name}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  #{r.rank} of {r.total}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Empty digest ───────────────────────────────────────────── */}
      {!digest?.topPost && !((digest?.followersGained ?? 0) > 0) && validRankings.length === 0 && (
        <div className="bg-card border border-border rounded-2xl px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            No activity was recorded for this week.
          </p>
        </div>
      )}

      {/* Timestamp */}
      <p className="text-[10px] text-muted-foreground text-center pt-2">
        Generated {formatDistanceToNow(notification.createdAt)} ago
      </p>
    </div>
  );
}

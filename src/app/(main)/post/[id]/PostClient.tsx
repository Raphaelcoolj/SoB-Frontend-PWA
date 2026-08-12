'use client';

import React, { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { ArrowLeft, FileText, MessageCircle, Swords } from 'lucide-react';
import Link from 'next/link';
import { fetchWithAuth } from '../../../../lib/api';
import { track } from '../../../../lib/analytics';
import PostCard from '../../../../components/post/PostCard';
import CommentSection from '../../../../components/comment/CommentSection';
import DebateSection from '../../../../components/debate/DebateSection';
import DebateLite from '../../../../components/debate/DebateLite';
import { Skeleton } from '../../../../components/ui/Skeleton';

const fetcher = (url: string) => fetchWithAuth(url).then(r => r.json()).then(d => d.data);

interface PostClientProps {
  postId: string;
}

type ArticleTab = 'overview' | 'comments' | 'debate';

const ARTICLE_TABS: { key: ArticleTab; label: string; Icon: typeof FileText }[] = [
  { key: 'overview', label: 'Overview', Icon: FileText },
  { key: 'comments', label: 'Comments', Icon: MessageCircle },
  { key: 'debate', label: 'Debate', Icon: Swords },
];

export default function PostClient({ postId }: PostClientProps) {
  const { data, isLoading, error } = useSWR(
    `/api/posts/${postId}`,
    fetcher
  );
  const viewedRef = useRef<string | null>(null);
  const readStartRef = useRef<number | null>(null);

  const [activeTab, setActiveTab] = useState<ArticleTab>('overview');
  const [initialArgumentId, setInitialArgumentId] = useState<string | undefined>(undefined);

  const post = data?.post;
  const isArticle = post?.contentType === 'article';

  useEffect(() => {
    if (post && viewedRef.current !== post._id) {
      viewedRef.current = post._id;
      readStartRef.current = Date.now();
      track({
        event: 'post_viewed',
        properties: { postId: String(post._id), contentType: post.contentType },
      });
    }

    return () => {
      // Report time-on-page to the read-time endpoint on unmount so the
      // backend can build weekly reading-activity stats (fires best-effort).
      if (readStartRef.current !== null) {
        const seconds = Math.min(Math.round((Date.now() - readStartRef.current) / 1000), 3600);
        readStartRef.current = null;
        if (seconds >= 1) {
          fetchWithAuth(`/api/posts/${post?._id}/read-time`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seconds }),
          }).catch(() => {});
        }
      }
    };
  }, [post]);

  // Deep link support: /post/:id?tab=debate&argument=:argId. The state is
  // flipped inside a timer so it never runs during the synchronous effect body
  // (react-hooks/set-state-in-effect).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') !== 'debate') return;
    const argumentId = params.get('argument') ?? undefined;
    const t = window.setTimeout(() => {
      setActiveTab('debate');
      setInitialArgumentId(argumentId);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  // Short posts have no tab bar; a debate deep link just scrolls to DebateLite.
  useEffect(() => {
    if (post?.contentType !== 'post') return;
    const wantsDebate = new URLSearchParams(window.location.search).get('tab') === 'debate';
    if (!wantsDebate) return;
    const t = window.setTimeout(() => {
      document.getElementById('debate-lite')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
    return () => window.clearTimeout(t);
  }, [post?.contentType]);

  if (isLoading) {
    return (
      <div className="space-y-4 pt-4">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="py-20 text-center text-muted-foreground">Post not found</div>
    );
  }

  // Author-facing moderation state (backend authoritative). The author may see
  // their own held/rejected content here, but it never surfaces publicly.
  const MODERATION_BANNERS: Record<string, { label: string; className: string }> = {
    review_required: { label: 'Under review — only you can see this post until it is approved.', className: 'bg-amber-500/10 border-amber-500/30 text-amber-600' },
    rejected: { label: 'This post was rejected by moderation and is not publicly visible.', className: 'bg-red-500/10 border-red-500/30 text-red-600' },
  };
  const moderationBanner = post.moderationStatus
    ? MODERATION_BANNERS[post.moderationStatus]
    : null;

  return (
    <div className="space-y-6 pb-20 pt-4">
      <Link href="/home" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm font-semibold transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Feed
      </Link>

      {moderationBanner && (
        <div className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${moderationBanner.className}`} role="status">
          <span>{moderationBanner.label}</span>
        </div>
      )}

      {isArticle ? (
        <>
          <nav aria-label="Article sections" className="flex border-b border-border w-full overflow-hidden">
            {ARTICLE_TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                aria-current={activeTab === key ? 'page' : undefined}
                className={`flex flex-1 min-w-0 items-center justify-center gap-1.5 px-2 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                  activeTab === key
                    ? 'text-accent border-accent'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </nav>

          {activeTab === 'overview' && <PostCard post={post} fullView={true} />}

          {activeTab === 'comments' && (
            <div className="bg-card border border-border rounded-xl">
              <CommentSection postId={post._id} contentType={post.contentType} />
            </div>
          )}

          {activeTab === 'debate' && (
            <DebateSection postId={post._id} contentType={post.contentType} initialArgumentId={initialArgumentId} />
          )}
        </>
      ) : (
        <>
          <PostCard post={post} fullView={true} />

          <div className="bg-card border border-border rounded-xl">
            <CommentSection postId={post._id} contentType={post.contentType} />
          </div>

          <DebateLite postId={post._id} />
        </>
      )}
    </div>
  );
}

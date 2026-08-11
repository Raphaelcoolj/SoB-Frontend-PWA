'use client';

import React, { useEffect, useRef } from 'react';
import useSWR from 'swr';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { fetchWithAuth } from '../../../../lib/api';
import { track } from '../../../../lib/analytics';
import PostCard from '../../../../components/post/PostCard';
import CommentSection from '../../../../components/comment/CommentSection';
import { Skeleton } from '../../../../components/ui/Skeleton';

const fetcher = (url: string) => fetchWithAuth(url).then(r => r.json()).then(d => d.data);

interface PostClientProps {
  postId: string;
}

export default function PostClient({ postId }: PostClientProps) {
  const { data, isLoading, error } = useSWR(
    `/api/posts/${postId}`,
    fetcher
  );
  const viewedRef = useRef<string | null>(null);
  const readStartRef = useRef<number | null>(null);

  const post = data?.post;

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

  return (
    <div className="space-y-6 pb-20 pt-4">
      <Link href="/home" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm font-semibold transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Feed
      </Link>
      
      <PostCard post={post} fullView={true} />
      
      <div className="bg-card border border-border rounded-xl">
        <CommentSection postId={post._id} contentType={post.contentType} />
      </div>
    </div>
  );
}

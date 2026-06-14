'use client';

/**
 * @file page.tsx (posts/[id])
 * @description Full post view page.
 */

import React from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { api } from '../../../../lib/api';
import PostCard from '../../../../components/post/PostCard';
import CommentSection from '../../../../components/comment/CommentSection';
import { Skeleton } from '../../../../components/ui/Skeleton';

// Note: For actual SEO dynamic metadata in App Router,
// generateMetadata must be in a separate Server Component file
// or the page must be a Server Component. 
// Given we use 'use client', dynamic metadata is limited.
// This is a placeholder for standard metadata.

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(d => d.data);

export default function PostPage() {
  const params = useParams();
  const postId = params.id as string;

  const { data, isLoading, error } = useSWR(
    `${process.env.NEXT_PUBLIC_API_URL}/api/posts/${postId}`,
    fetcher
  );

  const post = data?.post;

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

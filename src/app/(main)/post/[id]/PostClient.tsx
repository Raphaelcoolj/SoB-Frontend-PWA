'use client';

import React from 'react';
import useSWR from 'swr';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { fetchWithAuth } from '../../../../lib/api';
import PostCard from '../../../../components/post/PostCard';
import CommentSection from '../../../../components/comment/CommentSection';
import { Skeleton } from '../../../../components/ui/Skeleton';

const fetcher = (url: string) => fetchWithAuth(url).then(r => r.json()).then(d => d.data);

interface PostClientProps {
  postId: string;
}

export default function PostClient({ postId }: PostClientProps) {
  const { data, isLoading, error } = useSWR(
    `${process.env.NEXT_PUBLIC_API_URL}/api/posts/${postId}`,
    fetcher
  );

  // FIXED: Access post directly based on backend API response structure:
  // API returns: { success: true, data: { post: ... } }
  // The fetcher currently does: .then(d => d.data)
  // So 'data' here is { post: ... }
  const post = data?.post; 

  console.log('[PostClient] Post data (from fetcher.data):', data);
  console.log('[PostClient] Post object:', post);

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

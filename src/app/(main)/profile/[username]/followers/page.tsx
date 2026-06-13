'use client';

/**
 * @file page.tsx (profile/[username]/followers)
 * @description List of followers users with infinite scroll.
 */

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import useSWRInfinite from 'swr/infinite';
import useSWR from 'swr';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '../../../../../store/authStore';
import { UserAvatar } from '../../../../../components/user/UserAvatar';
import { FollowButton } from '../../../../../components/user/FollowButton';
import { Skeleton } from '../../../../../components/ui/Skeleton';
import { useInView } from 'react-intersection-observer';

const fetcher = (url: string, token: string) => 
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.json())
    .then(d => d.data);

const PAGE_SIZE = 10;

export default function FollowersListPage() {
  const params = useParams();
  const username = params.username as string;
  const { accessToken } = useAuthStore();
  const { ref, inView } = useInView();

  const { data: profileData } = useSWR(
    `${process.env.NEXT_PUBLIC_API_URL}/api/users/${username}`,
    (url: string) => fetch(url).then(r => r.json()).then(d => d.data)
  );

  const userId = profileData?.user?._id;

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (!userId) return null;
    if (previousPageData && !previousPageData.hasMore) return null;
    return `${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}/followers?page=${pageIndex + 1}&limit=${PAGE_SIZE}`;
  };

  const { data, size, setSize, isLoading, isValidating } = useSWRInfinite(
    getKey,
    (url: string) => fetcher(url, accessToken || ''),
    { revalidateFirstPage: false }
  );

  const users = data ? data.flatMap(page => page.followers) : [];
  const isEmpty = data?.[0]?.followers.length === 0;
  const isReachingEnd = isEmpty || (data && !data[data.length - 1]?.hasMore);

  useEffect(() => {
    if (inView && !isReachingEnd && !isValidating) {
      setSize(size + 1);
    }
  }, [inView, isReachingEnd, isValidating, size, setSize]);

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center gap-3">
        <Link href={`/profile/${username}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-black text-foreground capitalize">Followers</h1>
      </div>

      {isLoading && users.length === 0 ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-2 pb-10">
          {users.map((u: any) => (
            <div key={u._id} className="flex items-center justify-between p-3 bg-card border border-border rounded-xl">
              <Link href={`/profile/${u.username}`} className="flex items-center gap-3">
                <UserAvatar avatar={u.avatar} name={u.name} size="sm" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{u.name}</span>
                  <span className="text-xs text-muted-foreground">@{u.username}</span>
                </div>
              </Link>
              <FollowButton targetUserId={u._id} initialIsFollowing={u.isFollowing} />
            </div>
          ))}
          
          {isEmpty && (
            <div className="text-center py-10 text-muted-foreground">
              No followers yet.
            </div>
          )}

          {!isReachingEnd && (
            <div ref={ref} className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

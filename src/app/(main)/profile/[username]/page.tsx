'use client';

/**
 * @file page.tsx (profile/[username])
 * @description Public profile page showing avatar, bio, stats (followers/following/posts),
 * follow/unfollow button, and tabs switching between Articles and Posts feeds.
 * Infinite scroll for user posts via SWR.
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import useSWRInfinite from 'swr/infinite';
import useSWR from 'swr';
import { Settings2 } from 'lucide-react';
import { useAuthStore } from '../../../../store/authStore';
import UserAvatar from '../../../../components/user/UserAvatar';
import FollowButton from '../../../../components/user/FollowButton';
import PostCard from '../../../../components/post/PostCard';
import FieldBadge from '../../../../components/shared/FieldBadge';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { Field } from '../../../../types/user';
import { Post } from '../../../../types/post';

const BASE = process.env.NEXT_PUBLIC_API_URL;

const profileFetcher = (url: string, token?: string) =>
  fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  }).then(r => r.json()).then(d => d.data);

const postsFetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then(r => r.json()).then(d => d.data);

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { user: currentUser, accessToken } = useAuthStore();
  
  useEffect(() => {
    console.log('ProfilePage fetch attempt:', { username, accessToken: !!accessToken });
  }, [username, accessToken]);

  const [activeTab, setActiveTab] = useState<'articles' | 'posts'>('posts');
  const [followersCount, setFollowersCount] = useState<number | null>(null);

  const isOwnProfile = currentUser?.username === username;

  // Fetch profile data
  const { data: profileData, isLoading: profileLoading } = useSWR(
    username ? `${BASE}/api/users/${username}` : null,
    (url) => profileFetcher(url, accessToken || undefined),
    { revalidateOnFocus: false }
  );

  const profile = profileData?.user;
  const stats = profileData?.stats;

  // Infinite posts feed for this user
  const getPostKey = (pageIndex: number, prev: { posts: Post[] } | null) => {
    if (!profile?._id) return null;
    if (prev && prev.posts.length === 0) return null;
    return `${BASE}/api/posts/user/${profile._id}?page=${pageIndex + 1}&limit=10&contentType=${activeTab === 'articles' ? 'article' : 'post'}`;
  };

  const { data: postsPages, size, setSize, isValidating } = useSWRInfinite<{ posts: Post[] }>(
    getPostKey,
    postsFetcher,
    { revalidateOnFocus: false }
  );

  const posts = postsPages ? postsPages.flatMap(p => p.posts) : [];
  const isLoadingPosts = !postsPages && isValidating;
  const hasMorePosts = postsPages?.[postsPages.length - 1]?.posts.length === 10;

  const displayFollowers = followersCount ?? stats?.followersCount ?? 0;

  if (profileLoading) {
    return (
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-4">
          <Skeleton className="w-20 h-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
        <div className="flex gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 flex-1 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
        <div className="text-4xl">😕</div>
        <h3 className="font-bold text-foreground">User not found</h3>
        <p className="text-sm text-muted-foreground">@{username} doesn't seem to exist.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Profile header */}
      <div className="pt-2 space-y-4">
        <div className="flex items-start gap-4">
          <UserAvatar avatar={profile.avatar} name={profile.name} size="lg" className="w-20 h-20 text-2xl" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg text-foreground truncate">{profile.name}</h1>
              {profile.role === 'admin' && (
                <span className="text-[10px] uppercase tracking-wider bg-destructive/15 text-destructive border border-destructive/30 rounded-full px-2 py-0.5">
                  Admin
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          </div>
        </div>

        {/* Bio and Fields section spanning full width */}
        <div className="w-full">
          {profile.bio && (
            <div className="bg-card p-3 rounded-xl border border-border">
              <p className="text-sm text-foreground/90 leading-snug">{profile.bio}</p>
            </div>
          )}
          {/* Priority fields badges */}
          {Array.isArray(profile.priorityFields) && profile.priorityFields.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {(profile.priorityFields as Field[]).map((f, i) => (
                typeof f === 'object' ? <FieldBadge key={i} field={f} /> : null
              ))}
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="flex gap-4 text-center">
          <div className="flex-1 bg-card border border-border rounded-xl p-3">
            <div className="text-lg font-black text-foreground">{stats?.postsCount ?? 0}</div>
            <div className="text-xs text-muted-foreground">Posts</div>
          </div>
          <Link href={`/profile/${username}/followers`} className="flex-1 bg-card border border-border rounded-xl p-3 hover:bg-muted transition-colors">
            <div className="text-lg font-black text-foreground">{displayFollowers}</div>
            <div className="text-xs text-muted-foreground">Followers</div>
          </Link>
          <Link href={`/profile/${username}/following`} className="flex-1 bg-card border border-border rounded-xl p-3 hover:bg-muted transition-colors">
            <div className="text-lg font-black text-foreground">{stats?.followingCount ?? 0}</div>
            <div className="text-xs text-muted-foreground">Following</div>
          </Link>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          {isOwnProfile ? (
            <Link
              href="/settings/profile"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted transition-all duration-200"
            >
              <Settings2 className="w-4 h-4" />
              Edit Profile
            </Link>
          ) : (
            <div className="flex-1">
              <FollowButton
                targetUserId={profile._id}
                initialIsFollowing={Array.isArray(profile.followers) && profile.followers.includes(currentUser?._id || '')}
                onFollowChange={(isFollowing, newCount) => setFollowersCount(newCount)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Content tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl">
        {(['posts', 'articles'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSize(1); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Posts list */}
      {isLoadingPosts ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <div className="text-3xl">📝</div>
          <p className="text-sm text-muted-foreground">No {activeTab} yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => <PostCard key={post._id} post={post} />)}
          {hasMorePosts && (
            <button
              onClick={() => setSize(s => s + 1)}
              disabled={isValidating}
              className="w-full py-3 text-sm font-semibold text-accent hover:underline disabled:opacity-50 cursor-pointer"
            >
              {isValidating ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

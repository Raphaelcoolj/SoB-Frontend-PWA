'use client';

/**
 * @file page.tsx (profile/[username])
 * @description Public profile page. Handles:
 * - Own profile (Edit Profile button)
 * - Other profile: Follow + Block buttons
 * - Blocked by viewer: shows blocked wall
 * - Viewer blocked by owner: shows "user not found" experience
 * - Private account: shows lock wall for non-followers
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import useSWRInfinite from 'swr/infinite';
import useSWR from 'swr';
import { Settings2, Sparkles, Crown, Lock, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../../../store/authStore';
import UserAvatar from '../../../../components/user/UserAvatar';
import FollowButton from '../../../../components/user/FollowButton';
import BlockButton from '../../../../components/user/BlockButton';
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

const postsFetcher = async (url: string, token?: string) => {
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) {
    const err: any = new Error(json.message || 'Failed');
    err.status = res.status;
    throw err;
  }
  return json.data;
};

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { user: currentUser, accessToken } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'articles' | 'posts'>('posts');
  const [followersCount, setFollowersCount] = useState<number | null>(null);
  const [isBlockedByViewer, setIsBlockedByViewer] = useState(false);

  const isOwnProfile = currentUser?.username === username;

  // Fetch profile data
  const { data: profileData, isLoading: profileLoading, mutate: mutateProfile } = useSWR(
    username ? `${BASE}/api/users/${username}` : null,
    (url) => profileFetcher(url, accessToken || undefined),
    { revalidateOnFocus: false }
  );

  const profile = profileData?.user;
  const stats = profileData?.stats;

  // Sync block state from profile data
  useEffect(() => {
    if (profile) {
      setIsBlockedByViewer(profile.isBlocked || false);
    }
  }, [profile]);

  // Infinite posts feed for this user - only when canViewContent
  const canViewContent = profile?.canViewContent ?? true;
  const hasBlockedMe = profile?.hasBlockedMe ?? false;

  const getPostKey = (pageIndex: number, prev: { posts: Post[] } | null) => {
    if (!profile?._id) return null;
    if (!canViewContent) return null;
    if (isBlockedByViewer) return null;
    if (hasBlockedMe) return null;
    if (prev && prev.posts.length === 0) return null;
    return [`${BASE}/api/posts/user/${profile._id}?page=${pageIndex + 1}&limit=10&contentType=${activeTab === 'articles' ? 'article' : 'post'}`, accessToken || undefined];
  };

  const { data: postsPages, size, setSize, isValidating, error: postsError } = useSWRInfinite<{ posts: Post[] }>(
    getPostKey,
    ([url, token]) => postsFetcher(url, token),
    { revalidateOnFocus: false }
  );

  const posts = postsPages ? postsPages.flatMap(p => p.posts) : [];
  const isLoadingPosts = !postsPages && isValidating && canViewContent && !isBlockedByViewer && !hasBlockedMe;
  const hasMorePosts = postsPages?.[postsPages.length - 1]?.posts.length === 10;

  const displayFollowers = followersCount ?? stats?.followersCount ?? 0;

  const handleBlockChange = (nowBlocked: boolean) => {
    setIsBlockedByViewer(nowBlocked);
    mutateProfile();
  };

  // --- Loading skeleton ---
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

  // --- If viewer is blocked by this user (hasBlockedMe), show minimal 404-like experience ---
  if (hasBlockedMe) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-3 px-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
          <EyeOff className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-bold text-foreground">User not found</h3>
        <p className="text-sm text-muted-foreground">@{username} doesn&apos;t seem to exist.</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
        <h3 className="font-bold text-foreground">User not found</h3>
        <p className="text-sm text-muted-foreground">@{username} doesn&apos;t seem to exist.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Profile header */}
      <div className="pt-2 space-y-4">
        <div className="flex items-center gap-4">
          <UserAvatar avatar={profile.avatar} name={profile.name} size="lg" className="w-20 h-20 text-2xl" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg text-foreground truncate">{profile.name}</h1>
              {/* Badges */}
              {profile.earlyAdopter && (
                <span
                  title="Early Adopter"
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm"
                >
                  <Sparkles className="w-3 h-3" />
                </span>
              )}
              {profile.founderBadge && (
                <span
                  title="Founding Member"
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm"
                >
                  <Crown className="w-3 h-3" />
                </span>
              )}
              {/* Private indicator */}
              {profile.isPrivate && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                  <Lock className="w-2.5 h-2.5" />
                  Private
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          </div>
        </div>

        {/* Bio and Fields */}
        <div className="w-full">
          {profile.bio && !isBlockedByViewer && (
            <div className="bg-card p-3 rounded-xl border border-border">
              <p className="text-sm text-foreground/90 leading-snug">{profile.bio}</p>
            </div>
          )}
          {Array.isArray(profile.priorityFields) && profile.priorityFields.length > 0 && !isBlockedByViewer && (
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
            <div className="text-lg font-black text-foreground">
              {canViewContent && !isBlockedByViewer ? (stats?.postsCount ?? 0) : '—'}
            </div>
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
        <div className="flex gap-2">
          {isOwnProfile ? (
            <Link
              href="/settings/profile"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted transition-all duration-200"
            >
              <Settings2 className="w-4 h-4" />
              Edit Profile
            </Link>
          ) : (
            <>
              {/* Follow button (hidden when viewer blocked the user) */}
              {!isBlockedByViewer && (
                <div className="flex-1">
                  <FollowButton
                    targetUserId={profile._id}
                    initialIsFollowing={!!profile.isFollowing}
                    onFollowChange={(isFollowing, newCount) => setFollowersCount(newCount)}
                  />
                </div>
              )}
              {/* Block button (always shown for other profiles when logged in) */}
              {currentUser && (
                <BlockButton
                  targetUserId={profile._id}
                  targetUsername={profile.username}
                  initialIsBlocked={isBlockedByViewer}
                  onBlockChange={handleBlockChange}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── Blocked wall ─── */}
      {isBlockedByViewer && (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 bg-card border border-border rounded-2xl px-6">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <EyeOff className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">You blocked this user</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            You won&apos;t see their posts and they won&apos;t see yours.
            Unblock them to see their content again.
          </p>
        </div>
      )}

      {/* ─── Private account wall ─── */}
      {!isBlockedByViewer && !canViewContent && (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 bg-card border border-border rounded-2xl px-6">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
            <Lock className="w-7 h-7 text-accent" />
          </div>
          <p className="font-semibold text-foreground">This account is private</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Follow @{username} to see their posts and articles.
          </p>
        </div>
      )}

      {/* ─── Content tabs + posts (only when allowed) ─── */}
      {!isBlockedByViewer && canViewContent && (
        <>
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
              <p className="text-sm text-muted-foreground">No {activeTab === 'articles' ? 'stories' : 'posts'} yet.</p>
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
        </>
      )}
    </div>
  );
}

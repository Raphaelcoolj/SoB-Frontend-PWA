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
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWRInfinite from 'swr/infinite';
import useSWR from 'swr';
import { Settings2, Sparkles, Crown, Lock, EyeOff, Flag, ArrowLeft, Search, MoreVertical, Plus } from 'lucide-react';
import { useAuthStore } from '../../../../store/authStore';
import UserAvatar from '../../../../components/user/UserAvatar';
import FollowButton from '../../../../components/user/FollowButton';
import BlockButton from '../../../../components/user/BlockButton';
import ReportUserModal from '../../../../components/user/ReportUserModal';
import PostCard from '../../../../components/post/PostCard';
import FieldBadge from '../../../../components/shared/FieldBadge';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { Field } from '../../../../types/user';
import { Post } from '../../../../types/post';
import { toast } from 'sonner';

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
  const router = useRouter();
  const username = params.username as string;
  const { user: currentUser, accessToken } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'articles' | 'posts'>('posts');
  const [followersCount, setFollowersCount] = useState<number | null>(null);
  const [isBlockedByViewer, setIsBlockedByViewer] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

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

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/home');
    }
  };

  const handleShareProfile = () => {
    const profileUrl = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      navigator.share({
        title: `${profile?.name || username}'s Profile`,
        url: profileUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(profileUrl);
      toast.success('Profile link copied to clipboard!');
    }
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

      {showReportModal && profile && (
        <ReportUserModal
          userId={profile._id}
          username={profile.username}
          onClose={() => setShowReportModal(false)}
        />
      )}
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
    <div className="space-y-4 pb-16 -mt-4 lg:-mt-6">
      {/* Sticky Top Header Bar */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/40 py-2.5 px-4 flex items-center justify-between -mx-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-full hover:bg-muted text-foreground transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm font-bold text-foreground leading-tight truncate max-w-[180px] sm:max-w-xs">
              {profile.name}
            </h2>
            <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
              {canViewContent && !isBlockedByViewer ? `${stats?.postsCount ?? 0} Posts` : '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link href="/search" className="p-2 rounded-full hover:bg-muted text-foreground transition-colors">
            <Search className="w-5 h-5" />
          </Link>
          <Link href="/settings" className="p-2 rounded-full hover:bg-muted text-foreground transition-colors cursor-pointer">
            <MoreVertical className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Avatar block */}
      <div className="pt-2 flex items-start justify-between">
        <UserAvatar avatar={profile.avatar} name={profile.name} size="lg" className="w-20 h-20 text-3xl border-4 border-background shadow-md" />
      </div>

      {/* Profile info block */}
      <div className="space-y-3">
        {/* Name and Handle */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h1 className="text-xl font-extrabold text-foreground tracking-tight leading-tight">{profile.name}</h1>
            {/* Badges */}
            {profile.earlyAdopter && (
              <span
                title="Early Adopter"
                className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm"
              >
                <Sparkles className="w-2.5 h-2.5" />
              </span>
            )}
            {profile.founderBadge && (
              <span
                title="Founding Member"
                className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm"
              >
                <Crown className="w-2.5 h-2.5" />
              </span>
            )}
            {/* Private indicator */}
            {profile.isPrivate && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-muted text-muted-foreground border border-border">
                <Lock className="w-2 h-2" />
                Private
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
        </div>

        {/* Bio */}
        {profile.bio && !isBlockedByViewer && (
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
        )}

        {/* Priority Fields badges */}
        {Array.isArray(profile.priorityFields) && profile.priorityFields.length > 0 && !isBlockedByViewer && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {(profile.priorityFields as Field[]).map((f, i) => (
              typeof f === 'object' ? <FieldBadge key={i} field={f} /> : null
            ))}
          </div>
        )}

        {/* Stats Row */}
        <div className="flex gap-5 text-sm pt-0.5 text-muted-foreground">
          <Link href={`/profile/${username}/following`} className="hover:underline flex items-center">
            <span className="font-bold text-foreground mr-1">{stats?.followingCount ?? 0}</span> Following
          </Link>
          <Link href={`/profile/${username}/followers`} className="hover:underline flex items-center">
            <span className="font-bold text-foreground mr-1">{displayFollowers}</span> Followers
          </Link>
        </div>

        {/* Action buttons (Share & Edit / Follow & Block) */}
        <div className="flex gap-3 pt-1">
          {isOwnProfile ? (
            <>
              <button
                onClick={handleShareProfile}
                className="flex-1 py-2 rounded-full border border-border bg-card hover:bg-muted text-sm font-semibold text-foreground transition-all duration-200 cursor-pointer text-center active:scale-[0.98]"
              >
                Share
              </button>
              <Link
                href="/settings/profile"
                className="flex-1 py-2 rounded-full border border-border bg-card hover:bg-muted text-sm font-semibold text-foreground transition-all duration-200 text-center active:scale-[0.98] flex items-center justify-center"
              >
                Edit profile
              </Link>
            </>
          ) : (
            <>
              {/* Follow button (hidden when viewer blocked the user) */}
              {!isBlockedByViewer && (
                <div className="flex-1">
                  <FollowButton
                    targetUserId={profile._id}
                    initialIsFollowing={!!profile.isFollowing}
                    onFollowChange={(isFollowing, newCount) => setFollowersCount(newCount)}
                    className="w-full h-9 rounded-full text-xs font-semibold border border-border bg-card text-foreground hover:bg-muted transition-all duration-200 active:scale-95"
                  />
                </div>
              )}
              {/* Block button */}
              {currentUser && (
                <BlockButton
                  targetUserId={profile._id}
                  targetUsername={profile.username}
                  initialIsBlocked={isBlockedByViewer}
                  onBlockChange={handleBlockChange}
                  className={`
                    inline-flex items-center justify-center gap-1.5 px-4 h-9 rounded-full text-xs font-semibold
                    border transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer
                    ${isBlockedByViewer
                      ? 'border-border bg-card text-emerald-500 hover:bg-emerald-500/5'
                      : 'border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10'
                    }
                  `}
                />
              )}
              {/* Report user button */}
              {currentUser && !isOwnProfile && !isBlockedByViewer && (
                <button
                  onClick={() => setShowReportModal(true)}
                  className="px-3 h-9 rounded-full border border-border bg-card text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 transition-all cursor-pointer flex items-center justify-center"
                  aria-label={`Report @${profile.username}`}
                >
                  <Flag className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── Blocked wall ─── */}
      {isBlockedByViewer && (
        <div className="mx-2 mt-4 flex flex-col items-center justify-center py-16 text-center space-y-3 bg-card border border-border rounded-2xl px-6 animate-slide-up">
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
        <div className="mx-2 mt-4 flex flex-col items-center justify-center py-16 text-center space-y-3 bg-card border border-border rounded-2xl px-6 animate-slide-up">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
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
        <div className="pt-2">
          {/* Tabs header */}
          <div className="flex border-b border-border/40 -mx-4">
            {(['posts', 'articles'] as const).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setSize(1); }}
                  className="flex-1 py-3.5 text-sm font-semibold transition-all duration-200 cursor-pointer relative text-center flex flex-col items-center justify-center"
                >
                  <span className={`${isActive ? 'text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}`}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </span>
                  {isActive && (
                    <span className="absolute bottom-0 w-12 h-0.5 bg-accent rounded-full animate-in fade-in zoom-in-95 duration-200" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Posts list */}
          <div className="-mx-4">
            {isLoadingPosts ? (
              <div className="space-y-4 pt-4 px-4">
                {[1, 2].map(i => (
                  <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-3">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 px-4">
                <div className="text-3xl">📝</div>
                <p className="text-sm text-muted-foreground">No {activeTab === 'articles' ? 'stories' : 'posts'} yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30 pb-20">
                {posts.map(post => <PostCard key={post._id} post={post} variant="flat" />)}
                {hasMorePosts && (
                  <div className="px-4">
                    <button
                      onClick={() => setSize(s => s + 1)}
                      disabled={isValidating}
                      className="w-full py-4 text-sm font-semibold text-accent hover:underline disabled:opacity-50 cursor-pointer"
                    >
                      {isValidating ? 'Loading...' : 'Load more'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) on mobile */}
      {currentUser && (
        <Link
          href="/create"
          className="md:hidden fixed bottom-20 right-4 z-40 bg-accent text-white p-4 rounded-full shadow-lg hover:opacity-95 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          aria-label="Create new post"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </Link>
      )}

      {showReportModal && profile && (
        <ReportUserModal
          userId={profile._id}
          username={profile.username}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}

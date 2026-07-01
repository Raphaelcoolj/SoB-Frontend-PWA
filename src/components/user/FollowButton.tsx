'use client';

/**
 * @file FollowButton.tsx
 * @description Follow/Unfollow toggle button for user profiles.
 * Calls backend POST /api/users/:id/follow and updates UI state optimistically.
 */

import React, { useState, useEffect } from 'react';
import { useSWRConfig } from 'swr';
import { useAuthStore } from '../../store/authStore';
import { fetchWithAuth } from '../../lib/api';
import { Button } from '../ui/Button';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

interface FollowButtonProps {
  targetUserId: string;
  initialIsFollowing: boolean;
  onFollowChange?: (isFollowing: boolean, newCount: number) => void;
  className?: string;
}

export const FollowButton = ({ targetUserId, initialIsFollowing, onFollowChange, className }: FollowButtonProps) => {
  const { accessToken, user } = useAuthStore();
  const { mutate } = useSWRConfig();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);
  // Sync with prop if it changes (e.g. on navigation)
  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  // Don't render if it's the user's own profile
  if (user?._id === targetUserId) return null;

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card navigation if inside a card
    if (!accessToken) return;
    setLoading(true);

    // Optimistic update
    const previousState = isFollowing;
    setIsFollowing(!isFollowing);

    try {
      const res = await fetchWithAuth(`/api/users/${targetUserId}/follow`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        // Revert on failure
        setIsFollowing(previousState);
        toast.error('Failed to update follow status');
      } else {
        setIsFollowing(data.data.isFollowing);
        onFollowChange?.(data.data.isFollowing, data.data.followersCount);
        // FIXED: Invalidate user search cache
        mutate(key => typeof key === 'string' && key.includes('/api/search/users'));
      }
    } catch {
      setIsFollowing(previousState);
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        "inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer h-9 px-3",
        isFollowing
          ? "bg-muted text-muted-foreground border border-border"
          : "bg-accent text-foreground",
        className || "min-w-[90px]"
      )}
    >
      {loading && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />}
      {isFollowing ? 'Following' : 'Follow'}
    </button>
  );
};

export default FollowButton;

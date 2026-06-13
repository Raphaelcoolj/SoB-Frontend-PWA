'use client';

/**
 * @file FollowButton.tsx
 * @description Follow/Unfollow toggle button for user profiles.
 * Calls backend POST /api/users/:id/follow and updates UI state optimistically.
 */

import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { fetchWithAuth } from '../../lib/api';
import { Button } from '../ui/Button';
import { toast } from 'sonner';

interface FollowButtonProps {
  targetUserId: string;
  initialIsFollowing: boolean;
  onFollowChange?: (isFollowing: boolean, newCount: number) => void;
}

export const FollowButton = ({ targetUserId, initialIsFollowing, onFollowChange }: FollowButtonProps) => {
  const { accessToken, user } = useAuthStore();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  // Don't render if it's the user's own profile
  if (user?._id === targetUserId) return null;

  const handleToggle = async () => {
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
      }
    } catch {
      setIsFollowing(previousState);
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={isFollowing ? 'outline' : 'default'}
      size="sm"
      loading={loading}
      onClick={handleToggle}
      className="min-w-[90px]"
    >
      {isFollowing ? 'Unfollow' : 'Follow'}
    </Button>
  );
};

export default FollowButton;


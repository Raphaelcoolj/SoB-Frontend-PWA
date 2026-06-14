'use client';

/**
 * @file UserCard.tsx
 * @description Renders a user summary card. 
 * Used in search results, follower lists, etc.
 * Shows avatar, name, username, bio, and follow button.
 */

import React from 'react';
import Link from 'next/link';
import { Sparkles, Crown } from 'lucide-react';
import UserAvatar from './UserAvatar';
import { FollowButton } from './FollowButton';

interface UserCardProps {
  user: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
    bio?: string;
    isFollowing?: boolean;
    earlyAdopter?: boolean;
    founderBadge?: boolean;
  };
  showFollowButton?: boolean;
}

export default function UserCard({ user, showFollowButton = true }: UserCardProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-card border border-border rounded-2xl hover:border-accent/30 transition-all duration-200 group">
      <Link href={`/profile/${user.username}`} className="flex items-center gap-3 flex-1 min-w-0">
        <UserAvatar avatar={user.avatar} name={user.name} size="md" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate group-hover:text-accent transition-colors">
            {user.name}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-[10px] text-muted-foreground truncate">@{user.username}</p>
            {/* NEW: Badges in card */}
            {user.earlyAdopter && (
              <span title="Early Adopter">
                <Sparkles className="w-2.5 h-2.5 text-emerald-500" />
              </span>
            )}
            {user.founderBadge && (
              <span title="Founding Member">
                <Crown className="w-2.5 h-2.5 text-amber-500" />
              </span>
            )}
          </div>
          {user.bio && (
            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
              {user.bio}
            </p>
          )}
        </div>
      </Link>
      
      {showFollowButton && (
        <div className="flex-shrink-0 ml-4">
          <FollowButton targetUserId={user._id} initialIsFollowing={!!user.isFollowing} />
        </div>
      )}
    </div>
  );
}


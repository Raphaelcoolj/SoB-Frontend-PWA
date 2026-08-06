'use client';

/**
 * @file UserSuggestions.tsx
 * @description "Suggested for you" rail — accounts the user doesn't follow yet,
 * ranked by the backend (prefers publishers in the user's engaged fields). Renders
 * as a compact horizontal scroll on the home feed.
 */

import React from 'react';
import useSWR from 'swr';
import { UserPlus } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import UserAvatar from './UserAvatar';
import FollowButton from './FollowButton';
import { Skeleton } from '../ui/Skeleton';

const BASE = process.env.NEXT_PUBLIC_API_URL;

type SuggestionUser = {
  _id: string;
  name: string;
  username: string;
  avatar?: string;
  bio?: string;
  followersCount?: number;
  inEngagedField?: boolean;
};

export default function UserSuggestions({ limit = 8 }: { limit?: number }) {
  const { accessToken } = useAuthStore();
  const { data, isLoading } = useSWR<SuggestionUser[]>(
    accessToken ? `${BASE}/api/users/suggestions?limit=${limit}` : null,
    (url) =>
      fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
        .then((r) => r.json())
        .then((d) => d.data?.users ?? []),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  if (isLoading) {
    return (
      <div className="space-y-2 pt-2">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-28 flex-shrink-0 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const users = data || [];
  if (users.length === 0) return null;

  return (
    <section className="pt-2">
      <div className="flex items-center gap-1.5 mb-2">
        <UserPlus className="w-4 h-4 text-accent" />
        <h2 className="text-sm font-semibold text-foreground">Suggested for you</h2>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {users.map((u) => (
          <div
            key={u._id}
            className="flex-shrink-0 w-32 bg-card border border-border rounded-xl p-3 space-y-2"
          >
            <div className="flex justify-center">
              <UserAvatar avatar={u.avatar} name={u.name} size="md" />
            </div>
            <div className="text-center min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{u.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">@{u.username}</p>
            </div>
            <FollowButton
              targetUserId={u._id}
              initialIsFollowing={false}
              className="w-full h-7 rounded-full text-[10px] font-semibold border border-border bg-card text-foreground hover:bg-muted transition-all duration-200 active:scale-95 cursor-pointer"
            />
          </div>
        ))}
      </div>
      <style jsx global>{`.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{scrollbar-width:none}`}</style>
    </section>
  );
}
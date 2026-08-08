'use client';

/**
 * @file SuggestedUsers.tsx
 * @description "Find people worth following" — real public SoB profiles.
 */

import React from 'react';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import type { HomepageUser } from '../../types/homepage';
import { UserAvatar } from '../user/UserAvatar';
import SectionHeading from './SectionHeading';
import SectionMessage from './SectionMessage';
import { Skeleton } from '../ui/Skeleton';

interface SuggestedUsersProps {
  users: HomepageUser[];
  isLoading: boolean;
  hasError: boolean;
}

export default function SuggestedUsers({ users, isLoading, hasError }: SuggestedUsersProps) {
  const renderFollowerCount = (user: HomepageUser) => {
    if (user.followers === 0) return 'New to SoB';
    return `${user.followers} ${user.followers === 1 ? 'follower' : 'followers'}`;
  };

  return (
    <section aria-labelledby="people-heading" className="py-6 md:py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="People"
          title="Find people worth following"
          description="Public community members sharing ideas across topics."
          id="people-heading"
        />

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))}
          </div>
        ) : hasError ? (
          <SectionMessage message="People to follow are temporarily unavailable." />
        ) : users.length === 0 ? (
          <SectionMessage message="People to follow will appear here as the SoB community grows." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {users.map((user) => (
              <Link
                key={user.username}
                href={`/profile/${user.username}`}
                aria-label={`View profile of ${user.name} (@${user.username})`}
                className="group rounded-2xl border border-border bg-card/60 p-5 transition-colors hover:border-accent/40 hover:bg-card"
              >
                <UserAvatar avatar={user.avatar ?? undefined} name={user.name} size="lg" />
                <p className="mt-3 truncate text-sm font-semibold transition-colors group-hover:text-accent">
                  {user.name}
                </p>
                <p className="text-xs text-muted-foreground">@{user.username}</p>
                {user.bio && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{user.bio}</p>}
                {user.topics.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {user.topics.slice(0, 3).map((topic) => (
                      <span key={topic.slug} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {topic.name}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UserPlus className="h-3.5 w-3.5" />
                  {renderFollowerCount(user)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

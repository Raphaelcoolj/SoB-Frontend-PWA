'use client';

/**
 * @file TopBar.tsx
 * @description Top navigation for phones and tablets (below lg). Renders the full
 * header bar (profile round button at top-left + optional settings) for both
 * phone and tablet portrait layouts — tablets reuse the mobile layout, no side rail.
 * Landscape/desktop (lg+) switches to the Sidebar.
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MoreVertical } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import UserAvatar from '../user/UserAvatar';

export default function TopBar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  // Only show settings link (3 vertical dots) on the search page
  const showSettingsLink = pathname.startsWith('/search');

  // Header bar is hidden on profile and home routes since they render their own custom headers
  const hideTopBar = pathname.startsWith('/profile') || pathname === '/home';

  const profileHref = user ? `/profile/${user.username}` : '/login';

  return (
    !hideTopBar && (
      <header className="lg:hidden sticky top-0 z-40 w-full h-[calc(3.5rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] px-4 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-md will-change-transform">
        <Link href={profileHref} className="flex items-center">
          {user ? (
            <UserAvatar avatar={user.avatar} name={user.name} size="md" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-muted" />
          )}
        </Link>

        <div className="flex items-center gap-2">
          {showSettingsLink && (
            <Link href="/settings" className="p-2 text-muted-foreground hover:text-foreground">
              <MoreVertical className="w-5 h-5" />
            </Link>
          )}
        </div>
      </header>
    )
  );
}
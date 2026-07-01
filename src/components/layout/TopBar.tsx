'use client';

/**
 * @file TopBar.tsx
 * @description Mobile top navigation header.
 * Displays logo and quick actions (settings). Visible only on viewports below md (768px).
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MoreVertical } from 'lucide-react';
import Logo from '../shared/Logo';

export default function TopBar() {
  const pathname = usePathname();

  // Hide mobile TopBar on profile and home routes since they render their own custom headers
  if (pathname.startsWith('/profile') || pathname === '/home') {
    return null;
  }

  // Only show settings link (3 vertical dots) on the search page
  const showSettingsLink = pathname.startsWith('/search');

  return (
    <header className="md:hidden sticky top-0 z-40 w-full h-14 px-4 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-md will-change-transform">
      <Logo />
      
      <div className="flex items-center gap-2">
        {showSettingsLink && (
          <Link href="/settings" className="p-2 text-muted-foreground hover:text-foreground">
            <MoreVertical className="w-5 h-5" />
          </Link>
        )}
      </div>
    </header>
  );
}

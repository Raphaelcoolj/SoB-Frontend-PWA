'use client';

/**
 * @file TopBar.tsx
 * @description Mobile top navigation header.
 * Displays logo and quick actions (settings). Visible only on viewports below md (768px).
 */

import React from 'react';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import Logo from '../shared/Logo';

export default function TopBar() {
  return (
    <header className="md:hidden sticky top-0 z-40 w-full h-14 px-4 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-md">
      <Logo />
      
      <div className="flex items-center gap-2">
        <Link href="/settings" className="p-2 text-muted-foreground hover:text-foreground">
          <Settings className="w-5 h-5" />
        </Link>
      </div>
    </header>
  );
}

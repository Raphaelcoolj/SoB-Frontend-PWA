/**
 * @file Logo.tsx
 * @description Renders the platform branding.
 */

import React from 'react';
import Link from 'next/link';

export const Logo = () => {
  return (
    <Link href="/home" className="flex items-center gap-2 select-none hover:opacity-90 transition-opacity">
      <div className="relative w-8 h-8 flex-shrink-0">
        <img
          src="/android-chrome-192x192.png"
          alt="SoB"
          className="w-full h-full object-cover rounded-lg"
        />
      </div>
      <span className="font-semibold text-lg tracking-wider hidden md:inline-block text-foreground">
        SoB
      </span>
    </Link>
  );
};

export default Logo;

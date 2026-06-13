/**
 * @file layout.tsx ((auth))
 * @description Layout for authentication pages (login, register, etc.).
 * Centers content and provides a consistent auth-flow aesthetic.
 */

import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Auth card wrapper */}
        <div className="bg-card border border-border rounded-3xl shadow-xl p-8">
          {children}
        </div>
      </div>
    </div>
  );
}


/**
 * @file layout.tsx (main)
 * @description Layout wrapper for all authenticated main app pages.
 * Renders the responsive navigation shell (TopBar, BottomNav, Sidebar, TabletNav)
 * and initializes the Socket.io connection with the user's JWT token.
 * Redirects unauthenticated users to /login.
 */

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '../../components/layout/TopBar';
import BottomNav from '../../components/layout/BottomNav';
import Sidebar from '../../components/layout/Sidebar';
import TabletNav from '../../components/layout/TabletNav';
import { useAuthStore } from '../../store/authStore';
import { connectSocket } from '../../lib/socket';
import { useThemeStore, ACCENT_MAP } from '../../store/themeStore';
import TermsAgreementModal from '../../components/shared/TermsAgreementModal';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, accessToken, isLoading } = useAuthStore();
  const { accentColor } = useThemeStore();

  // Connect socket with JWT on mount
  useEffect(() => {
    if (accessToken) {
      connectSocket(accessToken);
    }
  }, [accessToken]);

  // Apply stored accent color on mount
  useEffect(() => {
    const hex = ACCENT_MAP[accentColor];
    document.documentElement.style.setProperty('--accent', hex);
  }, [accentColor]);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!isLoading && !accessToken) {
      router.replace('/login');
    }
  }, [accessToken, isLoading, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Auth protection check
  if (!user || !accessToken) {
    return null; // Will be redirected by useEffect
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile top bar */}
      <TopBar />

      {/* Tablet side nav (md to lg) */}
      <TabletNav />

      {/* Desktop sidebar (lg+) */}
      <Sidebar />

      {/* Main content area — offsets for each nav size */}
      <main className="
        pb-20 md:pb-0
        md:pl-20 lg:pl-64
        min-h-screen
      ">
        <div className="max-w-2xl mx-auto px-4 pt-4 lg:pt-6">
          {children}
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <BottomNav />

      {/* Terms agreement modal overlay */}
      <TermsAgreementModal />
    </div>
  );
}


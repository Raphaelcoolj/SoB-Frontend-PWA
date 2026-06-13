'use client';

/**
 * @file BottomNav.tsx
 * @description Mobile bottom tab navigation bar.
 * Visible only below 768px (md viewport).
 * Links to Home, Search, Create, Notifications, and the user's Profile.
 * Tracks and displays unread notification badges dynamically.
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusCircle, Bell, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { unreadCount } = useNotificationStore();

  // Navigation items mapping paths to icons
  const navItems = [
    { label: 'Home', path: '/home', icon: Home },
    { label: 'Search', path: '/search', icon: Search },
    { label: 'Create', path: '/create', icon: PlusCircle },
    { label: 'Notifications', path: '/notifications', icon: Bell, badge: true },
    { label: 'Profile', path: user ? `/profile/${user.username}` : '/login', icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-background/90 backdrop-blur-md border-t border-border flex items-center justify-around pb-safe-bottom">
      {navItems.map((item) => {
        const IconComponent = item.icon;
        // Determine active matching path
        const isActive = pathname.startsWith(item.path);

        return (
          <Link
            key={item.label}
            href={item.path}
            className={`relative flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-colors ${
              isActive ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <IconComponent className="w-6 h-6 stroke-[2]" />
            
            {/* Notification Badge indicator */}
            {item.badge && unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-destructive text-destructive-foreground text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center border border-background animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            
            <span className="sr-only">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}


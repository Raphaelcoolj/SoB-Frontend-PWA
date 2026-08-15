'use client';

/**
 * @file BottomNav.tsx
 * @description Mobile bottom tab navigation bar.
 * Visible only below md (768px).
 * Links to Home, Search, Create, Notifications, and the user's Profile.
 * Tracks and displays unread notification badges dynamically.
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Bell, Shield, MessageCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useChatUnread } from '../../hooks/useChatUnread';

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { unreadCount: notifUnread } = useNotificationStore();
  const chatUnread = useChatUnread();

  // Navigation items mapping paths to icons
  const navItems = [
    { label: 'Home', path: '/home', icon: Home },
    { label: 'Search', path: '/search', icon: Search },
    { label: 'Notifications', path: '/notifications', icon: Bell, badge: true },
    ...(user?.role === 'admin' ? [{ label: 'Admin', path: '/admin/dashboard', icon: Shield }] : []),
    { label: 'Chats', path: '/chats', icon: MessageCircle, badge: true, chatBadge: true },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-[calc(4rem+env(safe-area-inset-bottom,0px))] bg-background/80 backdrop-blur-md border-t border-border flex items-center justify-around pb-[env(safe-area-inset-bottom,0px)]">
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
            
            {/* Badge indicator */}
            {item.chatBadge && chatUnread > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-accent text-accent-foreground text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center border border-background animate-pulse">
                {chatUnread > 99 ? '99+' : chatUnread}
              </span>
            )}
            {item.badge && !item.chatBadge && notifUnread > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-destructive text-destructive-foreground text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center border border-background animate-pulse">
                {notifUnread > 99 ? '99+' : notifUnread}
              </span>
            )}
            
            <span className="sr-only">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}


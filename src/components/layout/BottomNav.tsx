'use client';

/**
 * @file BottomNav.tsx
 * @description Mobile/tablet bottom tab navigation bar.
 * Visible below lg (1024px) — tablet portrait uses the mobile layout; landscape/desktop (lg+)
 * switches to the Sidebar.
 * Links to Home, Search, Create, Notifications, and the user's Profile.
 * Tracks and displays unread notification badges dynamically.
 */

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Bell, Shield, MessageCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useChatUnread } from '../../hooks/useChatUnread';

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  // Narrow selector: this bar is mounted on every authenticated route, so a
  // whole-store subscription would re-render it on every notification payload.
  const notifUnread = useNotificationStore((s) => s.unreadCount);
  const chatUnread = useChatUnread();
  const [hidden, setHidden] = useState(false);
  // The pathname `hidden` was last computed against. Comparing it during render
  // is React's supported way to reset state when a prop changes, and it avoids
  // a setState-inside-effect (which cascades an extra render on navigation).
  const [hiddenOnPath, setHiddenOnPath] = useState(pathname);
  if (hiddenOnPath !== pathname) {
    setHiddenOnPath(pathname);
    setHidden(false);
  }
  const lastScrollYRef = useRef(0);

  // X-style behaviour: hide on sustained downward scroll, reveal on upward
  // scroll, always visible at the top of the page. Passive listener + transform
  // only, so no layout thrash or per-frame JS state churn.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollYRef.current;
      lastScrollYRef.current = y;
      if (y <= 0) {
        setHidden(false);
        return;
      }
      if (delta > 80 && y > 80) {
        setHidden(true);
      } else if (delta < -80) {
        setHidden(false);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // A new route always starts with the bar revealed (handled above during
  // render) and needs a fresh scroll baseline: without re-seeding, the first
  // scroll event of the new page is read as a jump against the old page's
  // offset and would immediately hide the bar again. No state is written here,
  // so this is a plain passive effect.
  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
  }, [pathname]);

  // Navigation items mapping paths to icons
  const navItems = [
    { label: 'Home', path: '/home', icon: Home },
    { label: 'Search', path: '/search', icon: Search },
    { label: 'Notifications', path: '/notifications', icon: Bell, badge: true },
    ...(user?.role === 'admin' ? [{ label: 'Admin', path: '/admin/dashboard', icon: Shield }] : []),
    { label: 'Chats', path: '/chats', icon: MessageCircle, badge: true, chatBadge: true },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-[calc(4rem+env(safe-area-inset-bottom,0px))] bg-background/80 backdrop-blur-md border-t border-border flex items-center justify-around pb-[env(safe-area-inset-bottom,0px)] transition-transform duration-300 ease-out will-change-transform"
      style={{ transform: hidden ? 'translateY(100%)' : 'translateY(0%)' }}
    >
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


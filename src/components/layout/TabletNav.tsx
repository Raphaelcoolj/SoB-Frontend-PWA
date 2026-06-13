'use client';

/**
 * @file TabletNav.tsx
 * @description Tablet navigation panel.
 * Visible only between md (768px) and lg (1024px) viewports.
 * Displays side-docked navigation icons without text labels. Hovering over icons triggers styling tooltips.
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusCircle, Bell, User, Settings, ShieldAlert, LogOut } from 'lucide-react';
import Logo from '../shared/Logo';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useAuth } from '../../hooks/useAuth';

export default function TabletNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const { logout } = useAuth();

  const navItems = [
    { label: 'Home', path: '/home', icon: Home },
    { label: 'Search', path: '/search', icon: Search },
    { label: 'Create', path: '/create', icon: PlusCircle },
    { label: 'Notifications', path: '/notifications', icon: Bell, badge: true },
    { label: 'Profile', path: user ? `/profile/${user.username}` : '/login', icon: User },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const isAdmin = user?.role === 'admin';

  return (
    <aside className="hidden md:flex lg:hidden flex-col fixed top-0 left-0 bottom-0 w-20 border-r border-border bg-card text-card-foreground items-center py-6 z-30">
      {/* Brand logo (mobile/icon form) */}
      <div className="mb-8">
        <Logo />
      </div>

      {/* Side icon list */}
      <nav className="flex-1 space-y-4 flex flex-col items-center w-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.path);

          return (
            <Link
              key={item.label}
              href={item.path}
              title={item.label}
              className={`relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 hover:bg-secondary group ${
                isActive ? 'text-accent bg-accent/10' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-6 h-6 stroke-[2]" />
              
              {/* Notification bubble badge */}
              {item.badge && unreadCount > 0 && (
                <span className="absolute top-2 right-2 bg-destructive border border-background rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] font-medium text-destructive-foreground">
                  {unreadCount}
                </span>
              )}

              {/* Premium hover tooltip */}
              <span className="absolute left-16 bg-popover text-popover-foreground text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-border shadow-md opacity-0 scale-95 origin-left pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-50">
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Protected admin routes */}
        {isAdmin && (
          <Link
            href="/admin/dashboard"
            title="Admin Panel"
            className={`relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 hover:bg-secondary group ${
              pathname.startsWith('/admin') ? 'text-accent bg-accent/10' : 'text-destructive hover:bg-destructive/10'
            }`}
          >
            <ShieldAlert className="w-6 h-6 stroke-[2]" />
            
            <span className="absolute left-16 bg-popover text-popover-foreground text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-border shadow-md opacity-0 scale-95 origin-left pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-50">
              Admin Panel
            </span>
          </Link>
        )}
      </nav>

      {/* Logout triggers */}
      {user && (
        <button
          onClick={logout}
          title="Log Out"
          className="relative flex items-center justify-center w-12 h-12 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 active:scale-90 group cursor-pointer"
        >
          <LogOut className="w-6 h-6" />
          
          <span className="absolute left-16 bg-popover text-popover-foreground text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-border shadow-md opacity-0 scale-95 origin-left pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-50">
            Log Out
          </span>
        </button>
      )}
    </aside>
  );
}


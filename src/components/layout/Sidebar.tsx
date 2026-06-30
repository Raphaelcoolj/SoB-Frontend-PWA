'use client';

/**
 * @file Sidebar.tsx
 * @description Desktop sidebar navigation.
 * Visible on screens larger than 1024px (lg viewport).
 * Displays full brand logo, label text alongside navigation icons, unread notification counts,
 * settings, admin dashboards (if admin), and a logout button at the base.
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusCircle, Bell, User, Settings, ShieldAlert } from 'lucide-react';
import Logo from '../shared/Logo';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useAuth } from '../../hooks/useAuth';

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const { logout } = useAuth();

  const navItems = [
    { label: 'Home', path: '/home', icon: Home },
    { label: 'Search', path: '/search', icon: Search },
    { label: 'Create', path: '/create', icon: PlusCircle },
    { label: 'Notifications', path: '/notifications', icon: Bell, badge: true },
    { label: 'Profile', path: user?.username ? `/profile/${user.username}` : '/home', icon: User },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const isAdmin = user?.role === 'admin';

  return (
    <aside className="hidden lg:flex flex-col fixed top-0 left-0 bottom-0 w-64 border-r border-border bg-background text-foreground p-6 z-30">
      {/* Brand Logo header */}
      <div className="mb-8">
        <Logo />
      </div>

      {/* Main navigation list */}
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.path);

          return (
            <Link
              key={item.label}
              href={item.path}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:bg-secondary active:scale-[0.98] ${
                isActive ? 'text-accent bg-accent/10 hover:bg-accent/15' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5 stroke-[2]" />
              <span className="flex-1">{item.label}</span>
              
              {item.badge && unreadCount > 0 && (
                <span className="bg-destructive text-destructive-foreground text-[10px] font-medium px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}

        {/* Protected Admin routes indicator */}
        {isAdmin && (
          <Link
            href="/admin/dashboard"
            className={`flex items-center gap-4 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:bg-secondary active:scale-[0.98] mt-4 ${
              pathname.startsWith('/admin') ? 'text-accent bg-accent/10 hover:bg-accent/15' : 'text-destructive hover:bg-destructive/10'
            }`}
          >
            <ShieldAlert className="w-5 h-5 stroke-[2]" />
            <span>Admin Panel</span>
          </Link>
        )}
      </nav>

      {/* Profile summary footer */}
      {user && (
        <div className="pt-4 border-t border-border mt-auto flex flex-col gap-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden border border-border flex items-center justify-center font-medium text-muted-foreground">
              {user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}


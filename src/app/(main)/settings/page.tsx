'use client';

/**
 * @file page.tsx (settings hub)
 * @description Settings hub page listing all settings sub-sections as navigation cards.
 */

import React from 'react';
import Link from 'next/link';
import { User, Bell, Palette, ShieldCheck, BookOpen, ChevronRight, Bookmark, FileText, MessageSquare } from 'lucide-react';

const SETTINGS_LINKS = [
  { href: '/settings/profile', icon: User, label: 'Edit Profile', description: 'Name, username, bio, profile photo' },
  { href: '/settings/account', icon: ShieldCheck, label: 'Account', description: 'Password, sign out, delete account' },
  { href: '/settings/notifications', icon: Bell, label: 'Notifications', description: 'Email and push notification preferences' },
  { href: '/settings/appearance', icon: Palette, label: 'Appearance', description: 'Dark/light mode and accent colors' },
  { href: '/settings/fields', icon: BookOpen, label: 'Fields', description: 'Manage your priority learning fields' },
  { href: '/settings/privacy', icon: ShieldCheck, label: 'Privacy', description: 'Account visibility, blocked users, data' },
  { href: '/bookmarks', icon: Bookmark, label: 'Bookmarks', description: 'View your saved posts' },
  { href: '/community-guidelines', icon: FileText, label: 'Community Guidelines', description: 'Our rules and standards' },
  { href: '/contact', icon: MessageSquare, label: 'Contact Us', description: 'Feedback, support, and inquiries' },
];

export default function SettingsPage() {
  return (
    <div className="space-y-5 pt-2">
      <div className="space-y-2">
        {SETTINGS_LINKS.map(({ href, icon: Icon, label, description }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-accent/40 hover:bg-accent/5 transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
              <Icon className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}


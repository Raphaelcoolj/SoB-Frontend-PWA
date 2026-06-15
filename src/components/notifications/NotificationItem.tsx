'use client';

/**
 * @file NotificationItem.tsx
 * @description Renders a single notification with dynamic text based on type.
 * Supports marking as read and linking to relevant content.
 */

import React from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, UserPlus, Flame, BookOpen } from 'lucide-react';
import { UserAvatar } from '../user/UserAvatar';
import { formatDistanceToNow } from '../../lib/utils';

interface NotificationItemProps {
  notification: any;
  onMarkAsRead?: (id: string) => void;
}

const NOTIFICATION_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  like: { icon: Heart, color: 'text-red-500 bg-red-500/10', label: 'liked your post' },
  comment: { icon: MessageCircle, color: 'text-blue-500 bg-blue-500/10', label: 'commented on your post' },
  follow: { icon: UserPlus, color: 'text-accent bg-accent/10', label: 'started following you' },
  debate: { icon: Flame, color: 'text-orange-500 bg-orange-500/10', label: 'started a debate on your post' },
  new_post: { icon: BookOpen, color: 'text-emerald-500 bg-emerald-500/10', label: 'published a new post' },
};

export default function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const config = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.like;
  const Icon = config.icon;

  const getLink = () => {
    if (notification.type === 'follow') return `/profile/${notification.sender.username}`;
    if (notification.post) return `/post/${notification.post._id || notification.post}`;
    return '#';
  };

  return (
    <Link 
      href={getLink()} 
      onClick={() => !notification.isRead && onMarkAsRead?.(notification._id)}
      className={`flex items-start gap-4 p-4 transition-all duration-200 border-b border-border/50 hover:bg-muted/30 group ${
        !notification.isRead ? 'bg-accent/5 border-l-4 border-l-accent' : 'bg-transparent border-l-4 border-l-transparent'
      }`}
    >
      <div className="relative flex-shrink-0">
        <UserAvatar avatar={notification.sender.avatar} name={notification.sender.name} size="md" />
        <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-background ${config.color}`}>
          <Icon className="w-2.5 h-2.5" />
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-foreground leading-snug">
            <span className="font-medium">{notification.sender.name}</span>{' '}
            <span className="text-muted-foreground">{config.label}</span>
          </p>
          <span className="text-[10px] text-muted-foreground flex-shrink-0">
            {formatDistanceToNow(notification.createdAt)}
          </span>
        </div>
        
        {notification.post && (
          <div className="bg-muted/40 p-2 rounded-lg border border-border/50">
            <p className="text-[10px] text-muted-foreground line-clamp-1 italic">
              {notification.post.title || notification.post.body || 'View post'}
            </p>
          </div>
        )}
      </div>

      {!notification.isRead && (
        <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
      )}
    </Link>
  );
}


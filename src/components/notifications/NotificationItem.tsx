'use client';

/**
 * @file NotificationItem.tsx
 * @description Renders a single notification with dynamic text based on type.
 * Supports marking as read and linking to relevant content.
 */

import React from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, UserPlus, Flame, BookOpen, AtSign, Calendar, BarChart2 } from 'lucide-react';
import { UserAvatar } from '../user/UserAvatar';
import { formatDistanceToNow } from '../../lib/utils';
import { track } from '../../lib/analytics';
import { isVideoUrl } from '../../lib/media';
import { Notification } from '../../types/notification';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
}

const NOTIFICATION_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  like: { icon: Heart, color: 'text-red-500 bg-red-500/10', label: 'liked your post' },
  comment: { icon: MessageCircle, color: 'text-blue-500 bg-blue-500/10', label: 'commented on your post' },
  follow: { icon: UserPlus, color: 'text-accent bg-accent/10', label: 'started following you' },
  debate: { icon: Flame, color: 'text-orange-500 bg-orange-500/10', label: 'started a debate on your post' },
  new_post: { icon: BookOpen, color: 'text-emerald-500 bg-emerald-500/10', label: 'published a new post' },
  mention: { icon: AtSign, color: 'text-purple-500 bg-purple-500/10', label: 'mentioned you' },
  weekly_digest: { icon: Calendar, color: 'text-accent bg-accent/10', label: 'your weekly digest is ready' },
  poll_vote: { icon: BarChart2, color: 'text-indigo-500 bg-indigo-500/10', label: 'voted on your poll' },
};

// NEW: Resolve a thumbnail for the post's media (Mux video thumb or first image URL).
function getMediaThumb(post: Notification['post']): string | null {
  if (!post) return null;
  if (post.muxPlaybackId) {
    return `https://image.mux.com/${post.muxPlaybackId}/thumbnail.jpg`;
  }
  const image = (post.mediaUrls || []).find((u) => !isVideoUrl(u));
  return image || null;
}

export default function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const config = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.like;
  const Icon = config.icon;

  const getLink = () => {
    if (notification.type === 'follow') return `/profile/${notification.sender?.username}`;
    if (notification.type === 'weekly_digest') return '/';
    if (notification.post) return `/post/${notification.post._id || notification.post}`;
    return '/';
  };

  const senderName = notification.type === 'weekly_digest' ? 'SoB' : notification.sender?.name || 'SoB';
  const senderAvatar = notification.type === 'weekly_digest' ? undefined : notification.sender?.avatar;

  const digest = notification.type === 'weekly_digest' ? notification.data : null;
  const post = notification.type !== 'weekly_digest' ? notification.post : undefined;
  const mediaThumb = post ? getMediaThumb(post) : null;

  return (
    <Link 
      href={getLink()} 
      onClick={() => {
        track({ event: 'notification_clicked', properties: { type: notification.type } });
        if (!notification.isRead) onMarkAsRead?.(notification._id);
      }}
      className={`flex items-start gap-4 p-4 transition-all duration-200 border-b border-border/50 hover:bg-muted/30 group ${
        !notification.isRead ? 'bg-accent/5 border-l-4 border-l-accent' : 'bg-transparent border-l-4 border-l-transparent'
      }`}
    >
      <div className="relative flex-shrink-0">
        <UserAvatar avatar={senderAvatar} name={senderName} size="md" />
        <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-background ${config.color}`}>
          <Icon className="w-2.5 h-2.5" />
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-foreground leading-snug">
            <span className="font-medium">{senderName}</span>{' '}
            <span className="text-muted-foreground">{config.label}</span>
          </p>
          <span className="text-[10px] text-muted-foreground flex-shrink-0">
            {formatDistanceToNow(notification.createdAt)}
          </span>
        </div>
        
        {notification.type === 'weekly_digest' && digest && (
          <div className="bg-muted/40 p-2 rounded-lg border border-border/50 space-y-1">
            {digest.topPost && (
              <p className="text-[11px] text-foreground line-clamp-1">
                <span className="font-medium">Top post:</span> {digest.topPost.title} — {digest.topPost.views} views · {digest.topPost.likes} likes
              </p>
            )}
            {digest.followersGained > 0 && (
              <p className="text-[11px] text-foreground">
                <span className="font-medium">{digest.followersGained}</span> new follower{digest.followersGained === 1 ? '' : 's'} gained
              </p>
            )}
            {digest.fieldRankings.length > 0 && (
              <p className="text-[11px] text-foreground line-clamp-1">
                <span className="font-medium">Ranked</span> in {digest.fieldRankings.map((r) => `${r.field.name} #${r.rank}`).join(', ')}
              </p>
            )}
          </div>
        )}

        {post && (
          <div className="flex items-center gap-2 bg-muted/40 p-2 rounded-lg border border-border/50">
            {mediaThumb && (
              <img
                src={mediaThumb}
                alt=""
                className="w-10 h-10 rounded object-cover border border-border/50 flex-shrink-0 bg-black"
              />
            )}
            <p className="text-[10px] text-muted-foreground line-clamp-1 italic min-w-0">
              {post.title || post.body || 'View post'}
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


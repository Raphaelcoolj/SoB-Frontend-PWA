'use client';

/**
 * @file NotificationItem.tsx
 * @description Renders a single notification with dynamic text based on type.
 * Supports marking as read and linking to relevant content.
 */

import React from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, UserPlus, Flame, BookOpen, AtSign, Calendar, BarChart2, Swords, Sparkles } from 'lucide-react';
import { UserAvatar } from '../user/UserAvatar';
import { formatDistanceToNow } from '../../lib/utils';
import { track } from '../../lib/analytics';
import { isVideoUrl } from '../../lib/media';
import { DEBATE_NOTIFICATION_TYPES, FeedReminderData, Notification, WeeklyDigestData } from '../../types/notification';
import { DebateNotificationData } from '../../types/debate';

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
  feed_reminder: { icon: Sparkles, color: 'text-amber-500 bg-amber-500/10', label: 'your feed misses you' },
  debate_created: { icon: Swords, color: 'text-orange-500 bg-orange-500/10', label: 'started a debate on your post' },
  debate_rebuttal: { icon: Swords, color: 'text-purple-500 bg-purple-500/10', label: 'rebutted your argument' },
  debate_reply: { icon: Swords, color: 'text-blue-500 bg-blue-500/10', label: 'replied to your argument' },
  debate_support: { icon: Swords, color: 'text-emerald-500 bg-emerald-500/10', label: 'supported your argument' },
  debate_mention: { icon: Swords, color: 'text-purple-500 bg-purple-500/10', label: 'mentioned you in a debate' },
  debate_closed: { icon: Swords, color: 'text-muted-foreground bg-muted/40', label: 'closed a debate' },
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

// Debate notifications carry a structured data payload (proposition, deep link…).
function getDebateData(notification: Notification): DebateNotificationData | null {
  if (!DEBATE_NOTIFICATION_TYPES.includes(notification.type)) return null;
  return notification.data ? (notification.data as DebateNotificationData) : null;
}

export default function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const config = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.like;
  const Icon = config.icon;

  // Comment replies read as "replied to your comment" instead of "commented on your post".
  const isCommentReply =
    notification.type === 'comment' &&
    !!(notification.data as { replyToComment?: boolean } | null)?.replyToComment;
  const label = isCommentReply ? 'replied to your comment' : config.label;

  const getLink = () => {
    const debateData = getDebateData(notification);
    if (debateData?.deepLinkPath) return debateData.deepLinkPath;
    if (notification.type === 'follow') return `/profile/${notification.sender?.username}`;
    if (notification.type === 'weekly_digest') return `/digest/${notification._id}`;
    if (notification.type === 'feed_reminder') return '/home';
    if (notification.post) return `/post/${notification.post._id || notification.post}`;
    return '/';
  };

  const isSystemNotification = notification.type === 'weekly_digest' || notification.type === 'feed_reminder';
  const senderName = isSystemNotification ? 'SoB' : notification.sender?.name || 'SoB';
  const senderAvatar = isSystemNotification ? undefined : notification.sender?.avatar;

  const digest = notification.type === 'weekly_digest' ? (notification.data as WeeklyDigestData | null) : null;
  const feedReminder = notification.type === 'feed_reminder' ? (notification.data as FeedReminderData | null) : null;
  const debateData = getDebateData(notification);
  const post = notification.type !== 'weekly_digest' && notification.type !== 'feed_reminder' ? notification.post : undefined;
  const mediaThumb = post ? getMediaThumb(post) : null;

  const aggregateOthers = notification.type === 'debate_support' && (debateData?.count ?? 0) > 1
    ? (debateData?.count ?? 0) - 1
    : 0;

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
            <span className="text-muted-foreground">
              {label}
              {aggregateOthers > 0 && ` (and ${aggregateOthers} other${aggregateOthers === 1 ? '' : 's'})`}
            </span>
          </p>
          <span className="text-[10px] text-muted-foreground flex-shrink-0">
            {formatDistanceToNow(notification.createdAt)}
          </span>
        </div>
        
        {notification.type === 'weekly_digest' && digest && (
          <div className="bg-muted/40 p-2 rounded-lg border border-border/50 space-y-1">
            {digest.topPost && (
              <p className="text-[11px] text-foreground line-clamp-1">
                <span className="font-medium">Top post:</span>{' '}
                {digest.topPost.title || digest.topPost.bodyPreview} — {digest.topPost.views} views · {digest.topPost.likes} likes
              </p>
            )}
            {digest.followersGained > 0 && (
              <p className="text-[11px] text-foreground">
                <span className="font-medium">{digest.followersGained}</span> new follower{digest.followersGained === 1 ? '' : 's'} gained
              </p>
            )}
            {digest.readingActivity && digest.readingActivity.totalArticlesRead > 0 && (
              <p className="text-[11px] text-foreground">
                <span className="font-medium">{digest.readingActivity.totalArticlesRead}</span> article{digest.readingActivity.totalArticlesRead === 1 ? '' : 's'} read this week
              </p>
            )}
            {(() => {
              const validRankings = (digest.fieldRankings || []).filter((r) => r.field?.name);
              return validRankings.length > 0 ? (
                <p className="text-[11px] text-foreground line-clamp-1">
                  <span className="font-medium">Ranked</span> in {validRankings.map((r) => `${r.field.name} #${r.rank}`).join(', ')}
                </p>
              ) : null;
            })()}
          </div>
        )}

        {feedReminder && (
          <div className="bg-muted/40 p-2 rounded-lg border border-border/50">
            <p className="text-[11px] text-foreground">
              <span className="font-medium">{feedReminder.postCount ?? 1}</span>{' '}
              new post{(feedReminder.postCount ?? 1) === 1 ? '' : 's'} waiting in your feed
            </p>
          </div>
        )}

        {debateData && (
          <div className="bg-muted/40 p-2 rounded-lg border border-border/50 space-y-1">
            {debateData.proposition && (
              <p className="text-[11px] text-foreground line-clamp-1 italic">
                &ldquo;{debateData.proposition}&rdquo;
              </p>
            )}
            {debateData.summary && (
              <p className="text-[11px] text-muted-foreground line-clamp-2">{debateData.summary}</p>
            )}
            {notification.type === 'debate_support' && aggregateOthers > 0 && (
              <p className="text-[11px] text-foreground">
                <span className="font-medium">+{aggregateOthers}</span> more supporter{aggregateOthers === 1 ? '' : 's'} on your argument
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
              {post.title || post.body || post.pollQuestion || 'View post'}
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


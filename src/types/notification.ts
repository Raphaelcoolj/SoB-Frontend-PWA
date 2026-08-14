import { User } from './user';
import { DebateNotificationData } from './debate';

export type NotificationType =
  | 'like'
  | 'comment'
  | 'follow'
  | 'debate'
  | 'new_post'
  | 'mention'
  | 'weekly_digest'
  | 'poll_vote'
  | 'feed_reminder'
  | 'debate_created'
  | 'debate_rebuttal'
  | 'debate_reply'
  | 'debate_support'
  | 'debate_mention'
  | 'debate_closed';

export const DEBATE_NOTIFICATION_TYPES: NotificationType[] = [
  'debate_created',
  'debate_rebuttal',
  'debate_reply',
  'debate_support',
  'debate_mention',
  'debate_closed',
];

export interface DigestArticle {
  _id: string;
  title: string | null;
  bodyPreview: string | null;
  fieldId: string | null;
  fieldName: string | null;
  author: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  } | null;
  readCount: number;
  mediaUrl?: string | null;
}

export interface DigestField {
  fieldId: string;
  fieldName: string;
  articleCount: number;
}

export interface DigestSuggestion {
  _id: string;
  title: string | null;
  bodyPreview: string | null;
  fieldId: string | null;
  fieldName: string | null;
  author: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  } | null;
  mediaUrl?: string | null;
  reason: string | null;
}

export interface WeeklyDigestData {
  period: {
    start: string;
    end: string;
  } | null;
  topPost: {
    /** Post title, or null for body-only posts (contentType 'post'). */
    title: string | null;
    /** Truncated plain-text body excerpt — used when title is null. */
    bodyPreview: string | null;
    views: number;
    likes: number;
  } | null;
  followersGained: number;
  fieldRankings: {
    field: {
      name: string;
      slug: string;
    };
    rank: number;
    total: number;
  }[];
  readingActivity: {
    totalArticlesRead: number;
    topArticles: DigestArticle[];
    topFields: DigestField[];
  };
  suggestions: DigestSuggestion[];
}

/** Payload for `comment` notifications. True when the comment is a reply to the recipient's comment. */
export interface CommentNotificationData {
  replyToComment?: boolean;
}

/** Payload for `feed_reminder` notifications ("your feed misses you"). */
export interface FeedReminderData {
  /** Number of relevant new posts waiting in the recipient's feed. */
  postCount?: number;
}

export type NotificationData = WeeklyDigestData | DebateNotificationData | CommentNotificationData | FeedReminderData;

export interface Notification {
  _id: string;
  recipient: string;
  sender: User;
  type: NotificationType;
  post?: {
    _id: string;
    title?: string;
    body?: string;
    contentType?: 'post' | 'article';
    mediaUrls?: string[];
    muxPlaybackId?: string;
  };
  data?: NotificationData | null;
  comment?: string;
  isRead: boolean;
  createdAt: string;
}

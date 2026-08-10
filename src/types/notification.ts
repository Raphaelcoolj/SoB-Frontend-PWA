import { User } from './user';

export type NotificationType =
  | 'like'
  | 'comment'
  | 'follow'
  | 'debate'
  | 'new_post'
  | 'mention'
  | 'weekly_digest'
  | 'poll_vote';

export interface WeeklyDigestData {
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
}

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
  data?: WeeklyDigestData | null;
  comment?: string;
  isRead: boolean;
  createdAt: string;
}

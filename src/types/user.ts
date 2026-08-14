export interface Field {
  _id: string;
  name: string;
  slug: string;
}

/** Per-category in-app/push notification toggles. Missing keys = enabled. */
export interface NotificationPreferences {
  feedReminders?: boolean;
  followerPosts?: boolean;
  likes?: boolean;
  comments?: boolean;
  mentions?: boolean;
}

export interface UserSettings {
  reEngagementOptOut?: boolean;
  notificationPreferences?: NotificationPreferences;
}

export interface User {
  _id: string;
  name: string;
  username: string;
  email: string;
  googleId?: string;
  avatar?: string;
  bio?: string;
  bioMentions?: {
    username: string;
    name: string;
    avatar?: string;
  }[];
  dob?: string | Date;
  role: 'user' | 'admin';
  priorityFields: string[] | Field[];
  emailNotifications: string[] | Field[];
  followers: string[] | User[];
  following: string[] | User[];
  isVerified: boolean;
  isOnboarded: boolean;
  isPrivate: boolean;
  // Relationship flags returned by profile endpoints (viewer-relative).
  isFollowing?: boolean;
  isFollowedBy?: boolean;
  canViewContent?: boolean;
  blockedUsers: string[] | User[];
  agreedToTerms?: boolean;
  settings?: UserSettings;
  pushSubscription?: {
    tokenType: 'web' | 'expo';
    endpoint?: string | null;
    keys?: {
      p256dh: string | null;
      auth: string | null;
    } | null;
    token?: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

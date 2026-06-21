export interface Field {
  _id: string;
  name: string;
  slug: string;
}

export interface User {
  _id: string;
  name: string;
  username: string;
  email: string;
  googleId?: string;
  avatar?: string;
  bio?: string;
  dob?: string | Date;
  role: 'user' | 'admin';
  priorityFields: string[] | Field[];
  emailNotifications: string[] | Field[];
  followers: string[] | User[];
  following: string[] | User[];
  isVerified: boolean;
  isOnboarded: boolean;
  isPrivate: boolean;
  blockedUsers: string[] | User[];
  agreedToTerms?: boolean;
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

import { User } from './user';

export type NotificationType = 'like' | 'comment' | 'follow' | 'debate' | 'new_post';

export interface Notification {
  _id: string;
  recipient: string;
  sender: User;
  type: NotificationType;
  post?: {
    _id: string;
    title?: string;
    body?: string;
  };
  comment?: string;
  isRead: boolean;
  createdAt: string;
}

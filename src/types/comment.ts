import { User } from './user';

export type CommentType = 'comment' | 'debate';

export interface Comment {
  _id: string;
  post: string;
  author: User;
  body: string;
  type: CommentType;
  parentComment: string | null;
  likes: string[]; // User IDs
  replies?: Comment[]; // Populated frontend-side
  createdAt: string;
  updatedAt: string;
}

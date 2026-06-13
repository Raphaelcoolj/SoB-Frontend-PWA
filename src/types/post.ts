import { User } from './user';
import { Field } from './user';

export type ContentType = 'article' | 'post';

export interface Post {
  _id: string;
  author: User;
  contentType: ContentType;
  title?: string;
  body: string;
  mediaUrls: string[];
  field: string | Field;
  tags: string[];
  likes: string[]; // User IDs
  shares: number;
  bookmarks: string[]; // User IDs
  comments: string[]; // Comment IDs
  isPublished: boolean;
  muxAssetId?: string;
  muxPlaybackId?: string;
  impressions: number;
  createdAt: string;
  updatedAt: string;
}

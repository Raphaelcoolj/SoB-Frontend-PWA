/**
 * @file homepage.ts
 * @description Types for the public homepage aggregate (GET /api/homepage).
 * Mirrors the backend DTO — only fields safe for unauthenticated visitors.
 */

export interface HomepageAuthor {
  username: string;
  name: string;
  avatar: string | null;
}

export interface HomepageTopic {
  name: string;
  slug: string;
}

export interface HomepageTopicPost {
  id: string;
  contentType: 'article' | 'post';
  title: string | null;
  bodyPreview: string;
  likes: number;
  comments: number;
  author: HomepageAuthor | null;
}

export interface HomepageTopicStat extends HomepageTopic {
  discussions: number;
  topPost: HomepageTopicPost | null;
}

export interface HomepagePost {
  id: string;
  contentType: 'article' | 'post';
  title: string | null;
  bodyPreview: string;
  mediaUrl: string | null;
  hasMedia: boolean;
  likes: number;
  comments: number;
  shares: number;
  createdAt: string;
  author: HomepageAuthor | null;
  topic: HomepageTopic | null;
}

export interface HomepageDiscussion {
  id: string;
  contentType: 'article' | 'post';
  title: string | null;
  bodyPreview: string;
  replies: number;
  createdAt: string;
  author: HomepageAuthor | null;
  topic: HomepageTopic | null;
}

export interface HomepageUser {
  username: string;
  name: string;
  avatar: string | null;
  bio: string | null;
  followers: number;
  topics: HomepageTopic[];
}

export interface HomepageData {
  posts: HomepagePost[];
  topics: HomepageTopicStat[];
  discussions: HomepageDiscussion[];
  users: HomepageUser[];
}

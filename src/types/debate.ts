/**
 * @file debate.ts — Debate domain types (mirrors the backend debate contract).
 *
 * Comments are conversation. Debate is structured disagreement around a
 * proposition, with FOR/AGAINST arguments, rebuttals, evidence and support.
 */

export type DebateStatus = 'OPEN' | 'CLOSED' | 'LOCKED';
export type DebateSide = 'FOR' | 'AGAINST';
export type DebateContentType = 'article' | 'post';

export interface DebateEvidence {
  url: string;
  title?: string;
  description?: string;
}

export interface DebateStats {
  forCount: number;
  againstCount: number;
  argumentCount: number;
  forPct: number;
  againstPct: number;
}

export interface DebateCreator {
  _id: string;
  name: string;
  username: string;
  avatar?: string;
}

export interface Debate {
  _id: string;
  contentId: string;
  contentType: DebateContentType;
  proposition: string;
  status: DebateStatus;
  creator: DebateCreator | string;
  closingDate: string | null;
  summary: string;
  argumentCount: number;
  forCount: number;
  againstCount: number;
  views: number;
  createdAt: string;
  updatedAt: string;
  stats: DebateStats;
}

export interface DebateArgumentUser {
  _id: string;
  name: string;
  username: string;
  avatar?: string;
}

export interface DebateArgument {
  _id: string;
  debate: string;
  author: DebateArgumentUser | string;
  side: DebateSide;
  body: string;
  evidence: DebateEvidence | null;
  parentArgument: string | null;
  rebuttalCount: number;
  supportsCount: number;
  downvotesCount: number;
  score: number;
  isSupported: boolean;
  isDownvoted: boolean;
  editedAt: string | null;
  moderationStatus: 'active' | 'removed';
  views: number;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ArgumentsResponse {
  arguments: DebateArgument[];
  pagination: Pagination;
}

export interface RebuttalsResponse {
  rebuttals: DebateArgument[];
  pagination: Pagination;
}

/**
 * Structured payload carried in `notification.data` for the debate
 * notification types. `deepLinkPath` is the canonical server-generated path
 * (content → Debate tab → specific argument), used verbatim by in-app links.
 */
export interface DebateNotificationData {
  debateId?: string | null;
  proposition?: string;
  contentId?: string | null;
  contentType?: 'article' | 'post' | null;
  argumentId?: string | null;
  side?: DebateSide | null;
  parentArgumentId?: string | null;
  deepLinkPath?: string;
  summary?: string;
  /** Aggregated support count for debate_support notifications. */
  count?: number;
}

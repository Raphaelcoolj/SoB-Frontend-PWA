/**
 * @file debate.ts — API client for the SoB structured Debate backend.
 * Uses fetchWithAuth (auto Bearer + 401 refresh) and unwraps `data`.
 */

import { fetchWithAuth } from '../lib/api';
import type {
  Debate,
  DebateArgument,
  ArgumentsResponse,
  RebuttalsResponse,
  DebateSide,
} from '../types/debate';

const unwrap = async <T>(r: Response | Promise<Response>): Promise<T> =>
  (await r).json().then((d) => d.data as T);

export const createDebate = (body: {
  contentId: string;
  contentType: 'article' | 'post';
  proposition: string;
  closingDate?: string | null;
}) => unwrap<{ debate: Debate }>(fetchWithAuth('/api/debates', {
  method: 'POST',
  body: JSON.stringify(body),
})).then((r) => r.debate);

export const getDebatesByContent = (contentId: string) =>
  unwrap<{ debates: Debate[] }>(fetchWithAuth(`/api/debates/by-content/${contentId}`)).then((r) => r.debates);

export const getDebate = (debateId: string) =>
  unwrap<{ debate: Debate }>(fetchWithAuth(`/api/debates/${debateId}`)).then((r) => r.debate);

export const updateDebate = (debateId: string, body: { proposition?: string; summary?: string; closingDate?: string | null }) =>
  unwrap<{ debate: Debate }>(fetchWithAuth(`/api/debates/${debateId}`, { method: 'PUT', body: JSON.stringify(body) })).then((r) => r.debate);

export const closeDebate = (debateId: string) =>
  unwrap<{ debate: Debate }>(fetchWithAuth(`/api/debates/${debateId}/close`, { method: 'POST', body: '{}' })).then((r) => r.debate);

export interface CreateArgumentInput {
  side: DebateSide;
  body: string;
  evidence?: { url: string; title?: string; description?: string } | null;
  parentArgumentId?: string;
}

export const createArgument = (debateId: string, input: CreateArgumentInput) =>
  unwrap<{ argument: DebateArgument }>(fetchWithAuth(`/api/debates/${debateId}/arguments`, {
    method: 'POST',
    body: JSON.stringify(input),
  })).then((r) => r.argument);

export const getArguments = (debateId: string, params: { side?: DebateSide; page?: number; limit?: number } = {}) => {
  const query = new URLSearchParams();
  if (params.side) query.set('side', params.side);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return unwrap<ArgumentsResponse>(fetchWithAuth(`/api/debates/${debateId}/arguments${qs ? `?${qs}` : ''}`));
};

export const getRebuttals = (argumentId: string, params: { page?: number; limit?: number } = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return unwrap<RebuttalsResponse>(fetchWithAuth(`/api/debates/arguments/${argumentId}/rebuttals${qs ? `?${qs}` : ''}`));
};

export const updateArgument = (argumentId: string, body: { body?: string; evidence?: { url: string; title?: string; description?: string } | null }) =>
  unwrap<{ argument: DebateArgument }>(fetchWithAuth(`/api/debates/arguments/${argumentId}`, { method: 'PUT', body: JSON.stringify(body) })).then((r) => r.argument);

export const deleteArgument = (argumentId: string) =>
  unwrap<{ message?: string }>(fetchWithAuth(`/api/debates/arguments/${argumentId}`, { method: 'DELETE' }));

export const toggleSupport = (argumentId: string) =>
  unwrap<{ supportsCount: number; downvotesCount: number; isSupported: boolean; isDownvoted: boolean }>(
    fetchWithAuth(`/api/debates/arguments/${argumentId}/support`, { method: 'POST', body: '{}' })
  );

export const toggleOppose = (argumentId: string) =>
  unwrap<{ supportsCount: number; downvotesCount: number; isSupported: boolean; isDownvoted: boolean }>(
    fetchWithAuth(`/api/debates/arguments/${argumentId}/oppose`, { method: 'POST', body: '{}' })
  );

export const reportDebate = (debateId: string, reason: string, description?: string) =>
  unwrap<{ message?: string }>(fetchWithAuth('/api/debates/report', {
    method: 'POST',
    body: JSON.stringify({ debateId, reason, description }),
  }));

export const reportArgument = (argumentId: string, reason: string, description?: string) =>
  unwrap<{ message?: string }>(fetchWithAuth('/api/debates/arguments/report', {
    method: 'POST',
    body: JSON.stringify({ argumentId, reason, description }),
  }));

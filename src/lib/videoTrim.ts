/**
 * @file videoTrim.ts
 * @description Pure helpers for the SoB video editor's trim timeline (PWA).
 *
 * These functions own all of the trim *math* (handle positions, selection
 * clamping, filmstrip frame times, time formatting) so the UI component stays
 * a thin renderer and every edge case is unit-testable. They mirror the native
 * `sob-native-app/src/lib/editor/video.ts` semantics: a two-handle selection
 * that can never exceed `MAX_SELECTION_SECONDS` (60s — the Mux upload limit) or
 * collapse below `MIN_SELECTION_SECONDS`.
 *
 * All time values are in seconds; all `frac`/`pct` values are normalized to
 * [0..1]. The filmstrip frames are sampled at evenly spaced times across the
 * *full* video so the user sees the entire clip while scrubbing, even when a
 * short selection is active.
 */

export const MAX_SELECTION_SECONDS = 60;
export const MIN_SELECTION_SECONDS = 0.1;
/** Number of thumbnails shown in the filmstrip (within the spec's 8-20 band). */
export const FILMSTRIP_FRAME_COUNT = 12;

export interface TrimRange {
  start: number;
  end: number;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

/** Rounds to milliseconds so pointer float drift never corrupts the range. */
function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

/** Converts a normalized [0..1] position on the timeline to a time in seconds. */
export function timeForPct(pct: number, duration: number): number {
  return clamp(pct, 0, 1) * Math.max(0, duration);
}

/** Converts a time in seconds to its normalized [0..1] position on the timeline. */
export function pctForTime(time: number, duration: number): number {
  if (duration <= 0) return 0;
  return clamp(time / duration, 0, 1);
}

/**
 * Moves one handle given its normalized position and clamps the resulting
 * selection: `end - start` is capped at `MAX_SELECTION_SECONDS`, the range
 * never leaves the video, and it never collapses below `MIN_SELECTION_SECONDS`.
 */
export function moveHandle(
  which: 'start' | 'end',
  pct: number,
  current: TrimRange,
  duration: number
): TrimRange {
  if (duration <= 0) return { start: 0, end: 0 };
  const t = timeForPct(pct, duration);

  if (which === 'start') {
    const maxStart = current.end - MIN_SELECTION_SECONDS;
    let start = clamp(t, 0, maxStart);
    if (current.end - start > MAX_SELECTION_SECONDS) {
      start = current.end - MAX_SELECTION_SECONDS;
    }
    return { start: round3(clamp(start, 0, Math.max(0, duration))), end: round3(current.end) };
  }

  const minEnd = current.start + MIN_SELECTION_SECONDS;
  let end = clamp(t, minEnd, duration);
  if (end - current.start > MAX_SELECTION_SECONDS) {
    end = current.start + MAX_SELECTION_SECONDS;
  }
  return { start: round3(current.start), end: round3(clamp(end, 0, duration)) };
}

/** Initializes the selection to the first 60s (or the whole clip if shorter). */
export function initialTrim(duration: number): TrimRange {
  const d = Math.max(0, duration);
  return { start: 0, end: Math.min(d, MAX_SELECTION_SECONDS) };
}

/** Sample times (in seconds) for the filmstrip thumbnails across the full clip. */
export function filmstripTimes(duration: number, count = FILMSTRIP_FRAME_COUNT): number[] {
  if (duration <= 0) return [];
  const n = Math.max(1, count);
  const times: number[] = [];
  for (let i = 0; i < n; i++) {
    // Offset by half a frame so the sample points are centered, avoiding a
    // degenerate frame exactly at 0 or duration.
    times.push((duration * (i + 0.5)) / n);
  }
  return times;
}

/** Formats seconds as `m:ss` (or `0:ss` for sub-minute clips). */
export function formatTrimTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

/** Whether the current selection is valid for export (non-collapsed, ≤60s). */
export function isTrimValid(trim: TrimRange): boolean {
  const len = trim.end - trim.start;
  return len >= MIN_SELECTION_SECONDS && len <= MAX_SELECTION_SECONDS;
}

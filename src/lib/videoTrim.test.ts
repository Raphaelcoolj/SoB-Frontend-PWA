import { describe, it, expect } from 'vitest';
import {
  clamp,
  filmstripTimes,
  formatTrimTime,
  initialTrim,
  isTrimValid,
  MAX_SELECTION_SECONDS,
  moveHandle,
  pctForTime,
  timeForPct,
} from './videoTrim';

describe('trim time helpers', () => {
  it('clamps values to a range', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('converts pct <-> time', () => {
    expect(timeForPct(0.5, 120)).toBe(60);
    expect(timeForPct(-1, 120)).toBe(0);
    expect(timeForPct(2, 120)).toBe(120);
    expect(pctForTime(60, 120)).toBeCloseTo(0.5);
    expect(pctForTime(0, 0)).toBe(0);
  });
});

describe('initialTrim', () => {
  it('defaults to the first 60s', () => {
    expect(initialTrim(120)).toEqual({ start: 0, end: MAX_SELECTION_SECONDS });
  });

  it('uses the full clip when shorter than 60s', () => {
    expect(initialTrim(30)).toEqual({ start: 0, end: 30 });
  });

  it('handles zero duration', () => {
    expect(initialTrim(0)).toEqual({ start: 0, end: 0 });
  });
});

describe('moveHandle', () => {
  it('clamps the start handle to the video bounds', () => {
    const r = moveHandle('start', -0.2, { start: 10, end: 60 }, 120);
    expect(r.start).toBe(0);
    expect(r.end).toBe(60);
  });

  it('keeps the selection below the 60s maximum when moving start back', () => {
    const r = moveHandle('start', 0, { start: 10, end: 60 }, 120);
    expect(r.start).toBe(0);
    expect(r.end).toBe(60);
    const r2 = moveHandle('start', 0, { start: 60, end: 120 }, 120);
    expect(r2.start).toBe(60);
    expect(r2.end).toBe(120);
  });

  it('caps the selection at 60 seconds', () => {
    const r = moveHandle('end', 100 / 90, { start: 0, end: 90 }, 90);
    expect(r.end).toBe(60);
    expect(r.start).toBe(0);
  });

  it('never lets the selection collapse below the minimum', () => {
    const r = moveHandle('end', 0.01, { start: 10, end: 11 }, 120);
    expect(r.end - r.start).toBeGreaterThanOrEqual(0.1 - 1e-3);
    const r2 = moveHandle('start', 0.99, { start: 10, end: 11 }, 120);
    expect(r2.end - r2.start).toBeGreaterThanOrEqual(0.1 - 1e-3);
  });

  it('pushes the end handle back when start exceeds it', () => {
    const r = moveHandle('start', 0.5, { start: 0, end: 2 }, 4);
    expect(r.start).toBeLessThanOrEqual(r.end - 0.1);
  });
});

describe('filmstripTimes', () => {
  it('produces evenly spaced centered samples', () => {
    const t = filmstripTimes(120, 4);
    expect(t).toHaveLength(4);
    expect(t[0]).toBeCloseTo(15);
    expect(t[1]).toBeCloseTo(45);
    expect(t[2]).toBeCloseTo(75);
    expect(t[3]).toBeCloseTo(105);
  });

  it('returns an empty list for zero duration', () => {
    expect(filmstripTimes(0)).toEqual([]);
  });

  it('defaults to 12 frames', () => {
    expect(filmstripTimes(60)).toHaveLength(12);
  });
});

describe('formatTrimTime', () => {
  it('formats m:ss', () => {
    expect(formatTrimTime(0)).toBe('0:00');
    expect(formatTrimTime(59)).toBe('0:59');
    expect(formatTrimTime(61)).toBe('1:01');
    expect(formatTrimTime(600)).toBe('10:00');
  });
});

describe('isTrimValid', () => {
  it('accepts a valid 60s selection', () => {
    expect(isTrimValid({ start: 0, end: 60 })).toBe(true);
  });

  it('rejects an empty or over-long selection', () => {
    expect(isTrimValid({ start: 0, end: 0 })).toBe(false);
    expect(isTrimValid({ start: 0, end: 61 })).toBe(false);
  });
});

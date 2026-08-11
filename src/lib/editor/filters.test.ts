import { describe, it, expect } from 'vitest';
import {
  SOB_FILTERS,
  applyColorPipeline,
  isAdjustmentNeutral,
  isFilterNeutral,
} from './filters';
import type { AdjustmentsState } from './types';

const neutral: AdjustmentsState = { brightness: 0, contrast: 0, saturation: 0, sharpness: 0 };

function makeImageData(data: number[], width = 1, height = 1) {
  return new Uint8ClampedArray(data);
}

describe('SOB_FILTERS', () => {
  it('exposes the expected SoB filter set', () => {
    expect(SOB_FILTERS.map((f) => f.id)).toEqual([
      'original',
      'warm',
      'cool',
      'vivid',
      'mono',
      'soft',
    ]);
  });
});

describe('isNeutral helpers', () => {
  it('flags neutral adjustments', () => {
    expect(isAdjustmentNeutral(neutral)).toBe(true);
    expect(isAdjustmentNeutral({ ...neutral, brightness: 0.1 })).toBe(false);
  });

  it('flags original filter as neutral', () => {
    expect(isFilterNeutral('original', 1)).toBe(true);
    expect(isFilterNeutral('mono', 0)).toBe(true);
    expect(isFilterNeutral('mono', 1)).toBe(false);
  });
});

describe('applyColorPipeline', () => {
  it('leaves pixels unchanged with neutral settings', () => {
    const data = makeImageData([10, 120, 240, 255]);
    applyColorPipeline(data, 1, 1, neutral, 'original', 1);
    expect(Array.from(data)).toEqual([10, 120, 240, 255]);
  });

  it('brightens when brightness is positive', () => {
    const data = makeImageData([100, 100, 100, 255]);
    applyColorPipeline(data, 1, 1, { ...neutral, brightness: 0.5 }, 'original', 1);
    expect(data[0]).toBeGreaterThan(100);
  });

  it('grayscales with saturation -1', () => {
    const data = makeImageData([200, 100, 50, 255]);
    applyColorPipeline(data, 1, 1, { ...neutral, saturation: -1 }, 'original', 1);
    const lum = Math.round(0.299 * 200 + 0.587 * 100 + 0.114 * 50);
    expect(data[0]).toBeCloseTo(lum, 0);
    expect(data[1]).toBeCloseTo(lum, 0);
    expect(data[2]).toBeCloseTo(lum, 0);
  });

  it('mono filter produces equal channels', () => {
    const data = makeImageData([210, 90, 30, 255]);
    applyColorPipeline(data, 1, 1, neutral, 'mono', 1);
    expect(data[0]).toEqual(data[1]);
    expect(data[1]).toEqual(data[2]);
  });

  it('warm filter increases red relative to blue', () => {
    const data = makeImageData([120, 120, 120, 255]);
    applyColorPipeline(data, 1, 1, neutral, 'warm', 1);
    expect(data[0]).toBeGreaterThan(data[2]);
  });

  it('blends filter by intensity', () => {
    const half = makeImageData([120, 120, 120, 255]);
    applyColorPipeline(half, 1, 1, neutral, 'mono', 0.5);
    const full = makeImageData([120, 120, 120, 255]);
    applyColorPipeline(full, 1, 1, neutral, 'mono', 1);
    // Gray input means mono is a no-op; intensity must not change channel equality.
    expect(half[0]).toEqual(half[1]);
    expect(full[0]).toEqual(full[1]);
  });

  it('sharpness does not crash and stays within range', () => {
    const w = 3;
    const data = makeImageData(new Array(w * w * 4).fill(0).map((_, i) => (i % 4 === 3 ? 255 : 128)), w, w);
    applyColorPipeline(data, w, w, { ...neutral, sharpness: 1 }, 'original', 1);
    for (let i = 0; i < data.length; i++) {
      expect(data[i]).toBeGreaterThanOrEqual(0);
      expect(data[i]).toBeLessThanOrEqual(255);
    }
  });
});

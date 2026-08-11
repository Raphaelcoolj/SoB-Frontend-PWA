/**
 * @file filters.ts
 * @description Original SoB filter definitions and the per-pixel color
 * pipeline (adjustments → filter → sharpness) used by both the live preview
 * and the final export. All functions are pure so the exact same math drives
 * the editor preview and the exported image.
 */

import type { AdjustmentsState, SoBFilter } from './types';

export const SOB_FILTERS: SoBFilter[] = [
  { id: 'original', name: 'Original', description: 'No filter applied' },
  { id: 'warm', name: 'Warm', description: 'Golden, sun-kissed tone' },
  { id: 'cool', name: 'Cool', description: 'Crisp, blue-leaning tone' },
  { id: 'vivid', name: 'Vivid', description: 'Boosted color saturation' },
  { id: 'mono', name: 'Mono', description: 'Classic black and white' },
  { id: 'soft', name: 'Soft', description: 'Gentle, low-contrast tone' },
];

export const ORIGINAL_FILTER_ID = 'original';

export function isFilterNeutral(filterId: string, intensity: number): boolean {
  return filterId === ORIGINAL_FILTER_ID || intensity <= 0;
}

export function isAdjustmentNeutral(a: AdjustmentsState): boolean {
  return (
    a.brightness === 0 &&
    a.contrast === 0 &&
    a.saturation === 0 &&
    a.sharpness === 0
  );
}

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Applies a single filter to one RGB pixel, returning [r,g,b]. */
function applyFilterPixel(id: string, r: number, g: number, b: number): [number, number, number] {
  switch (id) {
    case 'warm': {
      const l = luminance(r, g, b);
      return [clamp255(r + 14), clamp255(g + 6), clamp255(b - 10)];
    }
    case 'cool': {
      const l = luminance(r, g, b);
      return [clamp255(r - 10), clamp255(g + 2), clamp255(b + 16)];
    }
    case 'vivid': {
      const l = luminance(r, g, b);
      const f = 1.3;
      return [
        clamp255(l + (r - l) * f),
        clamp255(l + (g - l) * f),
        clamp255(l + (b - l) * f),
      ];
    }
    case 'mono': {
      const l = luminance(r, g, b);
      return [l, l, l];
    }
    case 'soft': {
      const l = luminance(r, g, b);
      const mix = 0.25;
      const contrast = 0.9;
      return [
        clamp255(((l + (r - l) * mix) - 128) * contrast + 128),
        clamp255(((l + (g - l) * mix) - 128) * contrast + 128),
        clamp255(((l + (b - l) * mix) - 128) * contrast + 128),
      ];
    }
    default:
      return [r, g, b];
  }
}

/**
 * Applies the SoB color pipeline to an ImageData buffer in place:
 * brightness → contrast → saturation → (blended) filter → sharpness.
 * The buffer's `data` array is mutated; alpha is left untouched.
 */
export function applyColorPipeline(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  adjustments: AdjustmentsState,
  filterId: string,
  filterIntensity: number
): void {
  const bright = adjustments.brightness * 255;
  const contrastFactor = 1 + adjustments.contrast;
  const satFactor = 1 + adjustments.saturation;
  const sharp = adjustments.sharpness;

  // Per-pixel color pass.
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    if (bright !== 0) {
      r = clamp255(r + bright);
      g = clamp255(g + bright);
      b = clamp255(b + bright);
    }
    if (contrastFactor !== 1) {
      r = clamp255((r - 128) * contrastFactor + 128);
      g = clamp255((g - 128) * contrastFactor + 128);
      b = clamp255((b - 128) * contrastFactor + 128);
    }
    if (satFactor !== 1) {
      const l = luminance(r, g, b);
      r = clamp255(l + (r - l) * satFactor);
      g = clamp255(l + (g - l) * satFactor);
      b = clamp255(l + (b - l) * satFactor);
    }
    if (!isFilterNeutral(filterId, filterIntensity)) {
      const [fr, fg, fb] = applyFilterPixel(filterId, r, g, b);
      const t = clamp01(filterIntensity);
      r = clamp255(r + (fr - r) * t);
      g = clamp255(g + (fg - g) * t);
      b = clamp255(b + (fb - b) * t);
    }
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  // Sharpness pass (unsharp-mask style 3x3 convolution) on luminance only.
  if (sharp > 0) {
    const k = sharp * 1.2;
    const src = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) src[i] = data[i];
    const w = width;
    const h = height;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const r = src[idx];
        const g = src[idx + 1];
        const b = src[idx + 2];
        const s00 = (x > 0 && y > 0) ? idx - w * 4 - 4 : idx;
        const s01 = (y > 0) ? idx - w * 4 : idx;
        const s02 = (x < w - 1 && y > 0) ? idx - w * 4 + 4 : idx;
        const s10 = (x > 0) ? idx - 4 : idx;
        const s12 = (x < w - 1) ? idx + 4 : idx;
        const s20 = (x > 0 && y < h - 1) ? idx + w * 4 - 4 : idx;
        const s21 = (y < h - 1) ? idx + w * 4 : idx;
        const s22 = (x < w - 1 && y < h - 1) ? idx + w * 4 + 4 : idx;

        const sh = (vals: number[], c: number) => c + k * (4 * c - vals[0] - vals[1] - vals[2] - vals[3]);

        const rN = [src[s10], src[s01], src[s21], src[s12]];
        const gN = [src[s10 + 1], src[s01 + 1], src[s21 + 1], src[s12 + 1]];
        const bN = [src[s10 + 2], src[s01 + 2], src[s21 + 2], src[s12 + 2]];

        data[idx] = clamp255(sh(rN, r));
        data[idx + 1] = clamp255(sh(gN, g));
        data[idx + 2] = clamp255(sh(bN, b));
      }
    }
  }
}

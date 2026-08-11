import { describe, it, expect } from 'vitest';
import {
  applyAspect,
  aspectFor,
  buildAffine,
  clampView,
  cropAspectValue,
  cropBox,
  cropOutputSize,
  resizeCrop,
  rotationMapping,
  rotatedSize,
  screenToNorm,
  viewportAffine,
} from './geometry';

describe('aspectFor', () => {
  it('returns null for free and a number for fixed presets', () => {
    expect(aspectFor('free', 1.5)).toBeNull();
    expect(aspectFor('1:1', 1.5)).toBe(1);
    expect(aspectFor('4:5', 1.5)).toBeCloseTo(0.8);
    expect(aspectFor('16:9', 1.5)).toBeCloseTo(16 / 9);
    expect(aspectFor('9:16', 1.5)).toBeCloseTo(9 / 16);
  });

  it('uses the source ratio for original', () => {
    expect(aspectFor('original', 4 / 3)).toBeCloseTo(4 / 3);
    expect(aspectFor('original', 0)).toBeNull();
  });
});

describe('cropAspectValue', () => {
  it('is free for the free preset', () => {
    expect(cropAspectValue('free', 4000, 3000, 0)).toBeNull();
  });

  it('maps a 1:1 output ratio into rotated-normalized space', () => {
    // 4000x3000 source, rot 0 -> normalized aspect = 1 * (rotH/rotW) = 0.75
    expect(cropAspectValue('1:1', 4000, 3000, 0)).toBeCloseTo(0.75);
    // rot 90 -> rot space is 3000x4000 -> 1 * (4000/3000)
    expect(cropAspectValue('1:1', 4000, 3000, 90)).toBeCloseTo(4 / 3);
  });

  it('matches the rotated source ratio for original', () => {
    expect(cropAspectValue('original', 4000, 3000, 0)).toBeCloseTo(1);
    expect(cropAspectValue('original', 4000, 3000, 90)).toBeCloseTo(1);
    expect(cropAspectValue('original', 4000, 3000, 270)).toBeCloseTo(1);
  });

  it('returns the ratio scaled by rotH/rotW for fixed presets', () => {
    expect(cropAspectValue('16:9', 4000, 3000, 0)).toBeCloseTo((16 / 9) * (3 / 4));
    expect(cropAspectValue('9:16', 4000, 3000, 90)).toBeCloseTo((9 / 16) * (4 / 3));
  });
});

describe('applyAspect', () => {
  it('keeps the center when adjusting a rect to a wider aspect', () => {
    const r = applyAspect({ x: 0.2, y: 0.2, width: 0.4, height: 0.4 }, 2);
    expect(r.width / r.height).toBeCloseTo(2);
    expect(r.x + r.width / 2).toBeCloseTo(0.4);
    expect(r.y + r.height / 2).toBeCloseTo(0.4);
  });

  it('clamps to the unit square and keeps ratio for 1:1', () => {
    const r = applyAspect({ x: 0, y: 0, width: 0.6, height: 0.8 }, 1);
    expect(r.width / r.height).toBeCloseTo(1);
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.y).toBeGreaterThanOrEqual(0);
    expect(r.x + r.width).toBeLessThanOrEqual(1 + 1e-9);
    expect(r.y + r.height).toBeLessThanOrEqual(1 + 1e-9);
  });

  it('returns the same rect for free aspect', () => {
    const r = applyAspect({ x: 0.1, y: 0.2, width: 0.5, height: 0.3 }, null);
    expect(r).toEqual({ x: 0.1, y: 0.2, width: 0.5, height: 0.3 });
  });
});

describe('rotationMapping', () => {
  it('identity for 0deg', () => {
    const m = rotationMapping(0);
    expect([m.alpha, m.beta, m.gamma]).toEqual([1, 0, 0]);
    expect([m.delta, m.eps, m.zeta]).toEqual([0, 1, 0]);
  });

  it('maps source top-right to rotated top-right for 90deg clockwise', () => {
    // source (1,0) -> rotated (1,1)
    const m = rotationMapping(90);
    const rx = m.alpha * 1 + m.beta * 0 + m.gamma;
    const ry = m.delta * 1 + m.eps * 0 + m.zeta;
    expect(rx).toBeCloseTo(1);
    expect(ry).toBeCloseTo(1);
  });
});

describe('buildAffine / viewportAffine', () => {
  it('identity maps source-normalized to output pixels (rot 0, no crop)', () => {
    const aff = buildAffine({
      rotation: 0,
      flipX: false,
      flipY: false,
      rotW: 100,
      rotH: 50,
      scaleX: 1,
      scaleY: 1,
      cropOriginX: 0,
      cropOriginY: 0,
      offsetX: 0,
      offsetY: 0,
    });
    // u=0 -> e, u=1 -> a+e
    expect(aff.e).toBeCloseTo(0);
    expect(aff.a).toBeCloseTo(100);
    expect(aff.d).toBeCloseTo(50);
    expect(aff.f).toBeCloseTo(0);
  });

  it('shifts the crop origin to the output origin', () => {
    const aff = buildAffine({
      rotation: 0,
      flipX: false,
      flipY: false,
      rotW: 100,
      rotH: 100,
      scaleX: 1,
      scaleY: 1,
      cropOriginX: 25,
      cropOriginY: 10,
      offsetX: 0,
      offsetY: 0,
    });
    // Source point u = 0.25 -> 25px rotated-space -> 0 output
    const outX = aff.a * 0.25 + aff.c * 0.25 + aff.e;
    expect(outX).toBeCloseTo(0);
  });

  it('90deg rotation places source (0,0) at top-right of the output', () => {
    const aff = buildAffine({
      rotation: 90,
      flipX: false,
      flipY: false,
      rotW: 100,
      rotH: 100,
      scaleX: 1,
      scaleY: 1,
      cropOriginX: 0,
      cropOriginY: 0,
      offsetX: 0,
      offsetY: 0,
    });
    // source (0,0) -> rotated (1,0) -> x = rotW
    const outX = aff.a * 0 + aff.c * 0 + aff.e;
    expect(outX).toBeCloseTo(100);
    const outY = aff.b * 0 + aff.d * 0 + aff.f;
    expect(outY).toBeCloseTo(0);
  });

  it('viewportAffine centers the crop in the viewport', () => {
    const box = cropBox(
      { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
      100,
      100,
      { scale: 1, tx: 0, ty: 0 },
      500,
      400
    );
    // crop px = 50x50 -> s = min(500/50, 400/50) = 8 -> box 400x400 centered
    expect(box.x).toBeCloseTo(50);
    expect(box.y).toBeCloseTo(0);
    expect(box.w).toBeCloseTo(400);
    expect(box.h).toBeCloseTo(400);
  });
});

describe('resizeCrop', () => {
  it('moves a rect and clamps to bounds', () => {
    const r = resizeCrop({ x: 0.2, y: 0.2, width: 0.3, height: 0.3 }, 'move', 0.6, -0.5, null);
    expect(r.x + r.width).toBeLessThanOrEqual(1 + 1e-9);
    expect(r.y).toBeGreaterThanOrEqual(0);
    expect(r.width).toBeCloseTo(0.3);
  });

  it('resizes the south-east corner', () => {
    const r = resizeCrop({ x: 0.2, y: 0.2, width: 0.3, height: 0.3 }, 'se', 0.2, 0.1, null);
    expect(r.width).toBeCloseTo(0.5);
    expect(r.height).toBeCloseTo(0.4);
    expect(r.x).toBeCloseTo(0.2);
  });

  it('resizes the north-west corner and keeps the opposite corner anchored', () => {
    const r = resizeCrop({ x: 0.2, y: 0.2, width: 0.4, height: 0.4 }, 'nw', 0.1, 0.05, null);
    expect(r.x).toBeCloseTo(0.3);
    expect(r.y).toBeCloseTo(0.25);
    expect(r.x + r.width).toBeCloseTo(0.6);
    expect(r.y + r.height).toBeCloseTo(0.6);
  });

  it('enforces a fixed aspect while resizing', () => {
    const r = resizeCrop({ x: 0.2, y: 0.2, width: 0.4, height: 0.4 }, 'se', 0.4, 0.4, 1);
    expect(r.width / r.height).toBeCloseTo(1);
    expect(r.width).toBeGreaterThan(0.4);
  });

  it('stays inside the unit square when a fixed aspect hits the bounds', () => {
    const r = resizeCrop({ x: 0, y: 0, width: 0.5, height: 0.5 }, 'se', 0.9, 0.9, 1);
    expect(r.x + r.width).toBeLessThanOrEqual(1 + 1e-9);
    expect(r.y + r.height).toBeLessThanOrEqual(1 + 1e-9);
    expect(r.width / r.height).toBeCloseTo(1);
  });

  it('never collapses a rect below the minimum size', () => {
    const r = resizeCrop({ x: 0.1, y: 0.1, width: 0.4, height: 0.4 }, 'nw', 0.2, 0.2, null);
    expect(r.width).toBeGreaterThanOrEqual(0.04);
    expect(r.height).toBeGreaterThanOrEqual(0.04);
  });
});

describe('clampView', () => {
  it('allows panning up to the image overhang', () => {
    // 100x100 image, 50x50 crop, viewport 400x400 -> s = 8 (crop fills), image 800px
    const v = clampView({ scale: 2, tx: 9999, ty: -9999 }, { x: 0.25, y: 0.25, width: 0.5, height: 0.5 }, 100, 100, 400, 400);
    // maxTx = s*(rotW - cropW)/2 ; s = min(400/50,400/50)*2 = 16 ; maxTx = 16*(100-50)/2 = 400
    expect(Math.abs(v.tx)).toBeLessThanOrEqual(400 + 1e-9);
    expect(Math.abs(v.ty)).toBeLessThanOrEqual(400 + 1e-9);
  });

  it('prevents pan when crop covers the whole image', () => {
    const v = clampView({ scale: 1, tx: 50, ty: 50 }, { x: 0, y: 0, width: 1, height: 1 }, 100, 100, 400, 400);
    expect(v.tx).toBeCloseTo(0);
    expect(v.ty).toBeCloseTo(0);
  });
});

describe('cropOutputSize / screenToNorm / rotatedSize', () => {
  it('rotatedSize swaps dims for 90deg', () => {
    expect(rotatedSize(4000, 3000, 90)).toEqual({ w: 3000, h: 4000 });
    expect(rotatedSize(4000, 3000, 180)).toEqual({ w: 4000, h: 3000 });
  });

  it('cropOutputSize returns crop pixel dims', () => {
    expect(cropOutputSize({ x: 0.1, y: 0.2, width: 0.5, height: 0.25 }, 4000, 3000)).toEqual({
      w: 2000,
      h: 750,
    });
  });

  it('screenToNorm maps screen points into the box', () => {
    const n = screenToNorm(25, 25, { x: 0, y: 0, w: 100, h: 100 });
    expect(n).toEqual({ x: 0.25, y: 0.25 });
  });
});

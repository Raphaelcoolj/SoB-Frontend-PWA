/**
 * @file geometry.ts
 * @description Pure geometry helpers for the SoB Image Editor. Everything in
 * this module is side-effect free and unit-tested. The editor renders the
 * source image through an affine transform that maps source-normalized
 * coordinates [0..1] into output/viewport pixel space, so preview and export
 * share the exact same math.
 */

import type { CropAspectKey, NormalizedRect, TransformState, ViewState } from './types';

export interface Affine {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

export function normalizeRect(r: NormalizedRect): NormalizedRect {
  const x = clamp(r.x, 0, 1);
  const y = clamp(r.y, 0, 1);
  const width = clamp(r.width, 0, 1 - x);
  const height = clamp(r.height, 0, 1 - y);
  return { x, y, width, height };
}

/**
 * Aspect ratio (w/h) implied by a crop preset. `original` returns the source
 * ratio; `free` returns null.
 */
export function aspectFor(key: CropAspectKey, sourceRatio: number): number | null {
  switch (key) {
    case 'free':
      return null;
    case 'original':
      return sourceRatio > 0 ? sourceRatio : null;
    case '1:1':
      return 1;
    case '4:5':
      return 4 / 5;
    case '16:9':
      return 16 / 9;
    case '9:16':
      return 9 / 16;
    default:
      return null;
  }
}

/** Adds a label for a crop preset (used by the UI). */
export function aspectLabel(key: CropAspectKey): string {
  switch (key) {
    case 'free':
      return 'Free';
    case 'original':
      return 'Original';
    case '1:1':
      return '1:1';
    case '4:5':
      return '4:5';
    case '16:9':
      return '16:9';
    case '9:16':
      return '9:16';
    default:
      return key;
  }
}

/**
 * The crop aspect to enforce in NORMALIZED coordinates for a given preset.
 * Normalized crop units live in rotated-image space, so a target output ratio
 * (width/height of the exported image) maps to `ratio * rotH/rotW`. `original`
 * matches the rotated source ratio, so a 90° turn correctly swaps the lock.
 */
export function cropAspectValue(
  key: CropAspectKey,
  sourceW: number,
  sourceH: number,
  rotation: number
): number | null {
  if (key === 'free') return null;
  const rot = rotatedSize(sourceW, sourceH, rotation);
  if (!rot.w || !rot.h) return null;
  const outputRatio =
    key === 'original'
      ? rot.w / rot.h
      : aspectFor(key, rot.w / rot.h);
  if (outputRatio == null || outputRatio <= 0) return null;
  return outputRatio * (rot.h / rot.w);
}

/**
 * Given a crop rect and a target aspect ratio (w/h, or null for free), returns
 * the crop rect adjusted to the target aspect while keeping its center and
 * staying inside the unit square. Aspect ratios wider than the current rect
 * widen the rect; taller ratios shrink it.
 */
export function applyAspect(crop: NormalizedRect, aspect: number | null): NormalizedRect {
  if (aspect === null || !Number.isFinite(aspect) || aspect <= 0) {
    return normalizeRect(crop);
  }
  const cx = crop.x + crop.width / 2;
  const cy = crop.y + crop.height / 2;

  let w = crop.width;
  let h = crop.height;
  if (w / h > aspect) {
    // Too wide — shrink width to match the target aspect.
    w = h * aspect;
  } else {
    // Too tall — shrink height to match the target aspect.
    h = w / aspect;
  }
  w = Math.min(w, 1);
  h = Math.min(h, 1);
  // Keep the aspect-ratio invariant after clamping to the unit square.
  if (w / h !== aspect) {
    if (w === 1) h = w / aspect;
    else if (h === 1) w = h * aspect;
  }
  const x = clamp(cx - w / 2, 0, 1 - w);
  const y = clamp(cy - h / 2, 0, 1 - h);
  return normalizeRect({ x, y, width: w, height: h });
}

/** Pixel size of a source image after a 90°-step rotation. */
export function rotatedSize(w: number, h: number, rotation: number): { w: number; h: number } {
  return rotation % 180 === 0 ? { w, h } : { w: h, h: w };
}

/**
 * The axis-aligned rotation mapping used to convert source-normalized
 * coordinates into rotated-space coordinates:
 *
 *   rx = alpha*u + beta*v + gamma
 *   ry = delta*u + eps*v + zeta
 *
 * (u,v) are source-normalized, (rx,ry) are rotated-space normalized.
 */
export function rotationMapping(rotation: number): {
  alpha: number; beta: number; gamma: number;
  delta: number; eps: number; zeta: number;
} {
  switch (rotation % 360) {
    case 90:
      return { alpha: 0, beta: -1, gamma: 1, delta: 1, eps: 0, zeta: 0 };
    case 180:
      return { alpha: -1, beta: 0, gamma: 1, delta: 0, eps: -1, zeta: 1 };
    case 270:
      return { alpha: 0, beta: 1, gamma: 0, delta: -1, eps: 0, zeta: 1 };
    default:
      return { alpha: 1, beta: 0, gamma: 0, delta: 0, eps: 1, zeta: 0 };
  }
}

export interface BuildAffineParams {
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  /** Rotated-space width of the source image in pixels. */
  rotW: number;
  /** Rotated-space height of the source image in pixels. */
  rotH: number;
  /** Scale factor from rotated-space pixels to output pixels (uniform). */
  scaleX: number;
  /** Scale factor from rotated-space pixels to output pixels (uniform). */
  scaleY: number;
  /** Crop origin in rotated-space pixels (top-left). */
  cropOriginX: number;
  /** Crop origin in rotated-space pixels (top-left). */
  cropOriginY: number;
  /** Extra translation in output pixels. */
  offsetX: number;
  offsetY: number;
}

/**
 * Builds the affine transform that maps source-normalized [0..1] coordinates
 * to output pixels. Consumption:
 *
 *   ctx.setTransform(aff.a, aff.b, aff.c, aff.d, aff.e, aff.f);
 *   ctx.drawImage(img, 0, 0, srcW, srcH, 0, 0, 1, 1);
 *
 * The crop is expressed in rotated-space pixels: cropOrigin is the top-left of
 * the crop in the rotated image, and the transform maps it to the origin of
 * the output, so only the cropped region is visible.
 */
export function buildAffine(p: BuildAffineParams): Affine {
  const m = rotationMapping(p.rotation);
  const alpha = p.flipX ? -m.alpha : m.alpha;
  const beta = p.flipY ? -m.beta : m.beta;
  const gamma = m.gamma + (p.flipX ? m.alpha : 0) + (p.flipY ? m.beta : 0);
  const delta = p.flipX ? -m.delta : m.delta;
  const eps = p.flipY ? -m.eps : m.eps;
  const zeta = m.zeta + (p.flipX ? m.delta : 0) + (p.flipY ? m.eps : 0);

  return {
    a: alpha * p.rotW * p.scaleX,
    b: delta * p.rotH * p.scaleY,
    c: beta * p.rotW * p.scaleX,
    d: eps * p.rotH * p.scaleY,
    e: gamma * p.rotW * p.scaleX - p.cropOriginX * p.scaleX + p.offsetX,
    f: zeta * p.rotH * p.scaleY - p.cropOriginY * p.scaleY + p.offsetY,
  };
}

/** Crop rect expressed in rotated-space pixels. */
export function cropPx(crop: NormalizedRect, rotW: number, rotH: number): Rect {
  return {
    x: crop.x * rotW,
    y: crop.y * rotH,
    w: crop.width * rotW,
    h: crop.height * rotH,
  };
}

/**
 * The affine transform that maps source-normalized coordinates to the
 * editor viewport. The crop region is centered in the viewport and then
 * offset by the view zoom/pan state.
 */
export function viewportAffine(
  rotation: number,
  flipX: boolean,
  flipY: boolean,
  crop: NormalizedRect,
  rotW: number,
  rotH: number,
  view: ViewState,
  vw: number,
  vh: number
): Affine {
  const cpx = cropPx(crop, rotW, rotH);
  const s = (Math.min(vw / cpx.w, vh / cpx.h) || 1) * view.scale;
  const offsetX = vw / 2 - (cpx.w * s) / 2 + view.tx;
  const offsetY = vh / 2 - (cpx.h * s) / 2 + view.ty;
  return buildAffine({
    rotation,
    flipX,
    flipY,
    rotW,
    rotH,
    scaleX: s,
    scaleY: s,
    cropOriginX: cpx.x,
    cropOriginY: cpx.y,
    offsetX,
    offsetY,
  });
}

/** The on-screen rect of the crop box (in viewport pixels). */
export function cropBox(
  crop: NormalizedRect,
  rotW: number,
  rotH: number,
  view: ViewState,
  vw: number,
  vh: number
): Rect {
  const cpx = cropPx(crop, rotW, rotH);
  const s = (Math.min(vw / cpx.w, vh / cpx.h) || 1) * view.scale;
  return {
    x: vw / 2 - (cpx.w * s) / 2 + view.tx,
    y: vh / 2 - (cpx.h * s) / 2 + view.ty,
    w: cpx.w * s,
    h: cpx.h * s,
  };
}

/** The on-screen rect of the full rotated image (in viewport pixels). */
export function imageRect(
  crop: NormalizedRect,
  rotW: number,
  rotH: number,
  view: ViewState,
  vw: number,
  vh: number
): Rect {
  const cpx = cropPx(crop, rotW, rotH);
  const s = (Math.min(vw / cpx.w, vh / cpx.h) || 1) * view.scale;
  return {
    x: vw / 2 - (cpx.x + cpx.w / 2) * s + view.tx,
    y: vh / 2 - (cpx.y + cpx.h / 2) * s + view.ty,
    w: rotW * s,
    h: rotH * s,
  };
}

/**
 * Clamps the view translation so the image can never be dragged fully outside
 * the crop area (the crop box always keeps at least one point of image under
 * it — in practice the crop box stays inside the image on both axes).
 */
export function clampView(view: ViewState, crop: NormalizedRect, rotW: number, rotH: number, vw: number, vh: number): ViewState {
  const cpx = cropPx(crop, rotW, rotH);
  const s = (Math.min(vw / cpx.w, vh / cpx.h) || 1) * view.scale;
  const maxTx = Math.max(0, (s * (rotW - cpx.w)) / 2);
  const maxTy = Math.max(0, (s * (rotH - cpx.h)) / 2);
  return {
    scale: view.scale,
    tx: clamp(view.tx, -maxTx, maxTx),
    ty: clamp(view.ty, -maxTy, maxTy),
  };
}

/** The default view state that fits the crop region inside the viewport. */
export function fitView(): ViewState {
  return { scale: 1, tx: 0, ty: 0 };
}

/** Maps a normalized crop-rect point to viewport pixels. */
export function normToScreen(
  nx: number,
  ny: number,
  box: Rect
): { x: number; y: number } {
  return { x: box.x + nx * box.w, y: box.y + ny * box.h };
}

/** Maps a viewport pixel point back to normalized crop-rect coordinates. */
export function screenToNorm(
  sx: number,
  sy: number,
  box: Rect
): { x: number; y: number } {
  if (!box.w || !box.h) return { x: 0.5, y: 0.5 };
  return {
    x: clamp((sx - box.x) / box.w, 0, 1),
    y: clamp((sy - box.y) / box.h, 0, 1),
  };
}

/**
 * Applies a zoom step (e.g. from a pinch) about the given viewport anchor
 * point, keeping the image content under the anchor stable.
 */
export function zoomAt(view: ViewState, anchorX: number, anchorY: number, factor: number): ViewState {
  const nextScale = Math.max(0.05, Math.min(view.scale * factor, 40));
  const applied = nextScale / view.scale;
  return {
    scale: nextScale,
    tx: anchorX - (anchorX - view.tx) * applied,
    ty: anchorY - (anchorY - view.ty) * applied,
  };
}

/** Rounds a crop rect to a given pixel output size for export. */
export function cropOutputSize(crop: NormalizedRect, rotW: number, rotH: number): { w: number; h: number } {
  const cpx = cropPx(crop, rotW, rotH);
  return { w: Math.max(1, Math.round(cpx.w)), h: Math.max(1, Math.round(cpx.h)) };
}

/** Which handle a pointer gesture is resizing. */
export type CropDragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e';

const MIN_CROP = 0.04;

/**
 * Resizes (or moves) a normalized crop rect by a normalized delta. When an
 * `aspect` (w/h) is provided the box is constrained to it while staying inside
 * the unit square and never collapsing below `MIN_CROP`.
 */
export function resizeCrop(
  rect: NormalizedRect,
  mode: CropDragMode,
  dx: number,
  dy: number,
  aspect: number | null
): NormalizedRect {
  const { x, y, width: w, height: h } = rect;

  if (mode === 'move') {
    const nx = clamp(x + dx, 0, 1 - w);
    const ny = clamp(y + dy, 0, 1 - h);
    return { x: nx, y: ny, width: w, height: h };
  }

  // The corner/edge opposite the dragged handle stays anchored.
  const anchorX = mode.includes('w') ? x + w : x;
  const anchorY = mode.includes('n') ? y + h : y;

  let newX = mode.includes('w') ? clamp(x + dx, 0, anchorX - MIN_CROP) : x;
  let newY = mode.includes('n') ? clamp(y + dy, 0, anchorY - MIN_CROP) : y;
  let newW = mode.includes('e') ? clamp(w + dx, MIN_CROP, 1 - x) : anchorX - newX;
  let newH = mode.includes('s') ? clamp(h + dy, MIN_CROP, 1 - y) : anchorY - newY;

  if (aspect && aspect > 0) {
    if (newW / newH > aspect) {
      newW = newH * aspect;
      if (mode.includes('w')) newX = anchorX - newW;
    } else {
      newH = newW / aspect;
      if (mode.includes('n')) newY = anchorY - newH;
    }
    newX = clamp(newX, 0, 1 - newW);
    newY = clamp(newY, 0, 1 - newH);
  }

  return normalizeRect({ x: newX, y: newY, width: newW, height: newH });
}

export type { TransformState };

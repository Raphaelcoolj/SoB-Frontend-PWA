/**
 * @file export.ts
 * @description Final-image export pipeline for the SoB Image Editor.
 *
 * Composition order (non-destructive):
 *   Original → Rotate/Flip → Crop → Adjustments → Filter → Drawing → Text
 *
 * The pipeline is chunked with periodic yields so the main thread stays
 * responsive while processing even very large images, and it accepts a cancel
 * token so a cancelled export never blocks the user.
 */

import type { ImageEditorState } from './types';
import {
  buildAffine,
  cropOutputSize,
  rotatedSize,
} from './geometry';
import { applyColorPipeline, isAdjustmentNeutral, isFilterNeutral } from './filters';
import { MAX_EXPORT_DIMENSION } from './load';

export interface ExportOptions {
  maxDimension?: number;
  /** JPEG quality 0..1 (ignored for PNG). */
  quality?: number;
  /** Override the output MIME (default derived from the source). */
  mimeType?: string;
  /** Cancels the pixel-processing phase when the token is aborted. */
  signal?: AbortSignal;
  onProgress?: (fraction: number) => void;
}

export interface ExportOutput {
  blob: Blob;
  file: File;
  mimeType: string;
  width: number;
  height: number;
}

function drawWithAffine(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  srcW: number,
  srcH: number,
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number
): void {
  ctx.setTransform(a, b, c, d, e, f);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, srcW, srcH, 0, 0, 1, 1);
}

/** Applies adjustments + filter to a canvas in place (chunked, cancellable). */
async function applyColorToCanvas(
  canvas: HTMLCanvasElement,
  state: ImageEditorState,
  opts: ExportOptions
): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Chunked pixel pass: ~32 rows per chunk, yielding between chunks.
  const CHUNK = Math.max(1, Math.round(height / 40));
  for (let y = 0; y < height; y += CHUNK) {
    if (opts.signal?.aborted) throw new Error('Export cancelled');
    const subHeight = Math.min(CHUNK, height - y);
    applyColorPipeline(
      data.subarray(y * width * 4, (y + subHeight) * width * 4) as Uint8ClampedArray,
      width,
      subHeight,
      state.adjustments,
      state.filter.id,
      state.filter.intensity
    );
    opts.onProgress?.((y + subHeight) / height);
    if (y + subHeight < height) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

/** Renders drawing paths onto the given canvas (already sized in output px). */
function renderDrawings(
  ctx: CanvasRenderingContext2D,
  state: ImageEditorState,
  outputW: number,
  outputH: number
): void {
  for (const path of state.drawings) {
    if (path.points.length < 1) continue;
    ctx.beginPath();
    const p0 = path.points[0];
    ctx.moveTo(p0.x * outputW, p0.y * outputH);
    for (let i = 1; i < path.points.length; i++) {
      const p = path.points[i];
      ctx.lineTo(p.x * outputW, p.y * outputH);
    }
    ctx.strokeStyle = path.eraser ? 'transparent' : path.color;
    ctx.lineWidth = Math.max(1, path.width * outputW);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (path.eraser) ctx.globalCompositeOperation = 'destination-out';
    else ctx.globalCompositeOperation = 'source-over';
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
}

/** Renders text overlays onto the given canvas (already sized in output px). */
function renderText(
  ctx: CanvasRenderingContext2D,
  state: ImageEditorState,
  outputW: number,
  outputH: number
): void {
  for (const t of state.overlays) {
    if (!t.text) continue;
    const fontSize = Math.max(6, t.fontSize * outputW);
    const lines = t.text.split('\n');
    const lineHeight = fontSize * 1.25;
    const totalH = lines.length * lineHeight;
    const fontStyle = `${t.bold ? '700' : '500'} ${fontSize}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

    ctx.save();
    ctx.translate(t.x * outputW, t.y * outputH);
    ctx.rotate((t.rotation * Math.PI) / 180);
    ctx.scale(t.scale, t.scale);
    ctx.font = fontStyle;
    ctx.textBaseline = 'middle';
    ctx.textAlign = t.align;

    // Measure the widest line for the background highlight.
    let maxW = 0;
    const widths = lines.map((l) => ctx.measureText(l).width);
    maxW = Math.max(0, ...widths);

    const startY = -totalH / 2 + lineHeight / 2;
    if (t.background) {
      const padX = fontSize * 0.25;
      const padY = fontSize * 0.15;
      let boxX;
      if (t.align === 'left') boxX = -padX;
      else if (t.align === 'right') boxX = -maxW - padX;
      else boxX = -maxW / 2 - padX;
      const boxY = -totalH / 2 - padY;
      ctx.fillStyle = t.background;
      ctx.fillRect(boxX, boxY, maxW + padX * 2, totalH + padY * 2);
    }

    ctx.fillStyle = t.color;
    lines.forEach((line, i) => {
      ctx.fillText(line, 0, startY + i * lineHeight);
    });
    ctx.restore();
  }
}

/**
 * Exports the composed image as a File/Blob. Never mutates the source; the
 * original image data is only read.
 */
export async function exportEditedImage(
  state: ImageEditorState,
  img: CanvasImageSource,
  opts: ExportOptions = {}
): Promise<ExportOutput> {
  const maxDimension = opts.maxDimension ?? MAX_EXPORT_DIMENSION;
  const srcW = state.source.width;
  const srcH = state.source.height;
  const rot = rotatedSize(srcW, srcH, state.transform.rotation);
  const out = cropOutputSize(state.crop, rot.w, rot.h);

  let outW = out.w;
  let outH = out.h;
  const scale = Math.min(1, maxDimension / Math.max(outW, outH));
  outW = Math.max(1, Math.round(outW * scale));
  outH = Math.max(1, Math.round(outH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create an export canvas.');

  const cpx = {
    x: state.crop.x * rot.w,
    y: state.crop.y * rot.h,
  };
  const aff = buildAffine({
    rotation: state.transform.rotation,
    flipX: state.transform.flipX,
    flipY: state.transform.flipY,
    rotW: rot.w,
    rotH: rot.h,
    scaleX: scale,
    scaleY: scale,
    cropOriginX: cpx.x,
    cropOriginY: cpx.y,
    offsetX: 0,
    offsetY: 0,
  });
  drawWithAffine(ctx, img, srcW, srcH, aff.a, aff.b, aff.c, aff.d, aff.e, aff.f);

  const needsColor =
    !isAdjustmentNeutral(state.adjustments) ||
    !isFilterNeutral(state.filter.id, state.filter.intensity);
  if (needsColor) {
    await applyColorToCanvas(canvas, state, { ...opts, onProgress: opts.onProgress });
  }

  // Drawing layer (eraser-safe, composited above the image).
  const hasDrawings = state.drawings.length > 0;
  if (hasDrawings) {
    const overlay = document.createElement('canvas');
    overlay.width = outW;
    overlay.height = outH;
    const octx = overlay.getContext('2d');
    if (octx) {
      renderDrawings(octx, state, outW, outH);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(overlay, 0, 0);
    }
  }

  // Text layer.
  if (state.overlays.length > 0) {
    renderText(ctx, state, outW, outH);
  }

  // Output format: preserve transparency for alpha sources unless overridden.
  const mimeType =
    opts.mimeType ?? (state.source.hasAlpha ? 'image/png' : 'image/jpeg');
  const quality = opts.quality ?? (mimeType === 'image/jpeg' ? 0.9 : undefined);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mimeType, quality);
  });
  if (!blob) throw new Error('Image export failed. The file may be too large to process on this device.');

  const baseName = state.source.name.replace(/\.[^.]+$/, '') || 'image';
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  const fileName = `${baseName}-sob.jpg`;
  const finalName = ext === 'png' ? `${baseName}-sob.png` : fileName;
  const file = new File([blob], finalName, { type: mimeType });

  return { blob, file, mimeType, width: outW, height: outH };
}

/**
 * @file load.ts
 * @description Client-side image loading helpers for the SoB Image Editor.
 * Sources are loaded as object URLs / HTMLImageElement (never base64), EXIF
 * orientation is normalized to the browser's built-in behaviour, and object
 * URLs are always released when the editor closes.
 */

import type { EditorSource } from './types';

export const MAX_PREVIEW_DIMENSION = 2048;
export const MAX_EXPORT_DIMENSION = 4096;

export function mimeHasAlpha(mimeType: string): boolean {
  return /image\/(png|webp|apng|avif)/i.test(mimeType);
}

/** Builds an EditorSource from a local File, resolving oriented dimensions. */
export function inspectImageFile(file: File): Promise<EditorSource> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Unsupported file type. Please choose an image.'));
      return;
    }
    const uri = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      if (!width || !height) {
        URL.revokeObjectURL(uri);
        reject(new Error('Could not read image dimensions. The file may be corrupt.'));
        return;
      }
      resolve({
        uri,
        width,
        height,
        mimeType: file.type || 'image/jpeg',
        name: file.name || 'image',
        hasAlpha: mimeHasAlpha(file.type),
      });
      // The image element itself is unreferenced after this point; the object
      // URL remains valid until explicitly revoked.
    };
    img.onerror = () => {
      URL.revokeObjectURL(uri);
      reject(new Error('Could not load the image. The file may be corrupt or unsupported.'));
    };
    img.src = uri;
  });
}

/** Loads a canvas-ready image element from an object URL. */
export function loadImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load the image for editing.'));
    img.decoding = 'async';
    img.src = uri;
  });
}

/**
 * Creates a drawable (ImageBitmap when supported, else the image element) at
 * a capped resolution. The preview never needs the full source resolution, so
 * this keeps memory use flat even for 4K camera photos.
 */
export async function createPreviewBitmap(
  uri: string,
  maxDimension = MAX_PREVIEW_DIMENSION
): Promise<CanvasImageSource> {
  const img = await loadImage(uri);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (w <= maxDimension && h <= maxDimension) {
    // Image is already small enough — use it directly.
    return img;
  }
  const scale = Math.min(1, maxDimension / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  const ctx = c.getContext('2d');
  if (!ctx) return img;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, c.width, c.height);
  try {
    if ('createImageBitmap' in window) {
      return await createImageBitmap(c);
    }
  } catch {
    /* fall through */
  }
  return c;
}

/** Releases the object URL held by an editor source. */
export function releaseSource(source: EditorSource | null): void {
  if (source?.uri && source.uri.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(source.uri);
    } catch {
      /* ignore */
    }
  }
}

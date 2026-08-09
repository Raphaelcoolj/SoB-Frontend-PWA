/**
 * @file media.ts
 * @description Unified media model + helpers shared by the create and edit composers.
 * A post holds either images OR a single video (never both), so all add/replace
 * logic flows through these helpers to keep the two composers consistent.
 */

export type MediaKind = 'image' | 'video';

/**
 * Detects whether a remote URL points at a video stream (Mux HLS) or a
 * Cloudinary-hosted video file. Used to type existing post media on edit.
 */
export function isVideoUrl(url: string): boolean {
  return /\.m3u8(\?|$)/i.test(url) || /\/video\/upload\//i.test(url);
}

/**
 * A single media item in a composer's selection.
 * - `kind: 'new'` items are local files the user attached (with an object-URL preview).
 * - `kind: 'existing'` items are media already on the post being edited.
 * - `removed` flags an existing item for deletion on save (kept in the UI for undo).
 */
export interface MediaItem {
  id: string;
  kind: 'new' | 'existing';
  isVideo: boolean;
  /** Present for `new` items — the local file to upload. */
  file?: File;
  /** Remote URL for `existing` items. */
  url?: string;
  /** Display source: object URL for new items, remote URL for existing items. */
  preview: string;
  /** Existing items flagged for removal on save. */
  removed?: boolean;
}

let idCounter = 0;
export function mediaId(): string {
  idCounter += 1;
  return `media_${Date.now()}_${idCounter}`;
}

export function makeNewMediaItem(file: File): MediaItem {
  return {
    id: mediaId(),
    kind: 'new',
    isVideo: file.type.startsWith('video/'),
    file,
    preview: URL.createObjectURL(file),
  };
}

export function makeExistingMediaItem(url: string): MediaItem {
  return {
    id: mediaId(),
    kind: 'existing',
    isVideo: isVideoUrl(url),
    url,
    preview: url,
  };
}

/** Releases the object URL held by a `new` item. Safe to call on any item. */
export function releaseMediaItem(item: MediaItem): void {
  if (item.kind === 'new' && item.preview) {
    try {
      URL.revokeObjectURL(item.preview);
    } catch {
      /* ignore */
    }
  }
}

export function isActiveItem(item: MediaItem): boolean {
  return !item.removed;
}

/** Whether the active (non-removed) items contain a video. */
export function hasActiveVideo(items: MediaItem[]): boolean {
  return items.some((i) => isActiveItem(i) && i.isVideo);
}

/** Whether the active (non-removed) items contain an image. */
export function hasActiveImage(items: MediaItem[]): boolean {
  return items.some((i) => isActiveItem(i) && !i.isVideo);
}

/**
 * Merges incoming items into the current selection while enforcing the
 * single-media-type rule. When the incoming type conflicts with the active
 * items' type, the conflicting active items are flagged `removed` (existing)
 * or returned in the `replaced` list (so callers can purge/revoke them).
 *
 * @returns `{ merged, replaced }` — the merged array and any items dropped
 *          due to a type conflict.
 */
export function mergeMediaWithConstraint(
  current: MediaItem[],
  incoming: MediaItem[]
): { merged: MediaItem[]; replaced: MediaItem[] } {
  if (incoming.length === 0) return { merged: current, replaced: [] };

  const incomingVideo = incoming.some((i) => i.isVideo);
  const currentVideo = hasActiveVideo(current);
  const currentImage = hasActiveImage(current);

  const conflicting =
    (incomingVideo && currentImage) || (!incomingVideo && currentVideo);
  if (!conflicting) return { merged: [...current, ...incoming], replaced: [] };

  const replaced = current.filter(
    (i) => isActiveItem(i) && (incomingVideo ? !i.isVideo : i.isVideo)
  );
  const replacedIds = new Set(replaced.map((i) => i.id));
  const merged = [
    ...current.map((i) => (replacedIds.has(i.id) ? { ...i, removed: true } : i)),
    ...incoming,
  ];
  return { merged, replaced };
}

/** Drops removed items from the list (for the create composer). */
export function purgeRemoved(items: MediaItem[]): MediaItem[] {
  return items.filter((i) => !i.removed);
}

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isVideoUrl,
  makeNewMediaItem,
  makeExistingMediaItem,
  releaseMediaItem,
  mergeMediaWithConstraint,
  purgeRemoved,
  hasActiveVideo,
  hasActiveImage,
} from './media';

describe('isVideoUrl', () => {
  it('detects Mux HLS streams', () => {
    expect(isVideoUrl('https://stream.mux.com/abc123.m3u8')).toBe(true);
    expect(isVideoUrl('https://stream.mux.com/abc123.m3u8?foo=bar')).toBe(true);
  });

  it('detects Cloudinary-hosted videos', () => {
    expect(isVideoUrl('https://res.cloudinary.com/x/video/upload/v1/a.mp4')).toBe(true);
  });

  it('treats images as not videos', () => {
    expect(isVideoUrl('https://res.cloudinary.com/x/image/upload/v1/a.jpg')).toBe(false);
    expect(isVideoUrl('https://cloudinary.test/img.jpg')).toBe(false);
    expect(isVideoUrl('')).toBe(false);
  });
});

describe('makeNewMediaItem / makeExistingMediaItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new image item with an object URL preview', () => {
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    const item = makeNewMediaItem(file);
    expect(item.kind).toBe('new');
    expect(item.isVideo).toBe(false);
    expect(item.file).toBe(file);
    expect(item.preview).toMatch(/^blob:/);
  });

  it('creates a new video item flagged as video', () => {
    const file = new File(['x'], 'a.mp4', { type: 'video/mp4' });
    expect(makeNewMediaItem(file).isVideo).toBe(true);
  });

  it('creates an existing item from a Mux URL as video', () => {
    const item = makeExistingMediaItem('https://stream.mux.com/abc.m3u8');
    expect(item.kind).toBe('existing');
    expect(item.isVideo).toBe(true);
    expect(item.url).toBe('https://stream.mux.com/abc.m3u8');
    expect(item.preview).toBe('https://stream.mux.com/abc.m3u8');
  });

  it('creates an existing image item as image', () => {
    expect(makeExistingMediaItem('https://cloudinary.test/img.jpg').isVideo).toBe(false);
  });

  it('releases object URLs only for new items', () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    releaseMediaItem(makeNewMediaItem(file));
    expect(revoke).toHaveBeenCalledTimes(1);
    revoke.mockClear();
    releaseMediaItem(makeExistingMediaItem('https://cloudinary.test/img.jpg'));
    expect(revoke).not.toHaveBeenCalled();
  });
});

describe('mergeMediaWithConstraint (single media type)', () => {
  const img = makeNewMediaItem(new File(['x'], 'a.jpg', { type: 'image/jpeg' }));
  const img2 = makeNewMediaItem(new File(['x'], 'b.jpg', { type: 'image/jpeg' }));
  const vid = makeNewMediaItem(new File(['x'], 'v.mp4', { type: 'video/mp4' }));

  it('appends images to images without replacing', () => {
    const { merged, replaced } = mergeMediaWithConstraint([img], [img2]);
    expect(merged).toHaveLength(2);
    expect(replaced).toHaveLength(0);
    expect(hasActiveImage(merged)).toBe(true);
    expect(hasActiveVideo(merged)).toBe(false);
  });

  it('marks existing images removed when a video is added', () => {
    const { merged, replaced } = mergeMediaWithConstraint([img, img2], [vid]);
    expect(merged).toHaveLength(3);
    expect(replaced).toHaveLength(2);
    expect(merged.filter((i) => i.removed)).toHaveLength(2);
    expect(hasActiveImage(merged)).toBe(false);
    expect(hasActiveVideo(merged)).toBe(true);
  });

  it('marks an existing video removed when images are added', () => {
    const { merged, replaced } = mergeMediaWithConstraint([vid], [img]);
    expect(replaced).toHaveLength(1);
    expect(replaced[0].id).toBe(vid.id);
    expect(merged.find((i) => i.id === vid.id)?.removed).toBe(true);
    expect(hasActiveVideo(merged)).toBe(false);
    expect(hasActiveImage(merged)).toBe(true);
  });

  it('does not touch already-removed items when adding the opposite type', () => {
    const removedImg = { ...img, removed: true };
    const { merged, replaced } = mergeMediaWithConstraint([removedImg], [vid]);
    expect(merged.find((i) => i.id === removedImg.id)?.removed).toBe(true);
    expect(replaced).toHaveLength(0);
  });

  it('returns current unchanged when incoming is empty', () => {
    const { merged, replaced } = mergeMediaWithConstraint([img], []);
    expect(merged).toEqual([img]);
    expect(replaced).toHaveLength(0);
  });

  it('purgeRemoved drops only removed items', () => {
    const removed = { ...img2, removed: true };
    expect(purgeRemoved([img, removed])).toEqual([img]);
  });
});

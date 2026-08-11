import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MediaUploader from './MediaUploader';
import { makeNewMediaItem, makeExistingMediaItem } from '../../lib/media';

describe('MediaUploader', () => {
  it('renders nothing when there are no items', () => {
    const { container } = render(<MediaUploader items={[]} onRemove={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders an image preview with an img tag', () => {
    const item = makeExistingMediaItem('https://cloudinary.test/img.jpg');
    render(<MediaUploader items={[item]} onRemove={() => {}} />);
    const img = screen.getByAltText('Media preview 1');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://cloudinary.test/img.jpg');
  });

  it('renders a video preview with a video tag (Mux URL)', () => {
    const item = makeExistingMediaItem('https://stream.mux.com/abc.m3u8');
    render(<MediaUploader items={[item]} onRemove={() => {}} />);
    const video = document.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', 'https://stream.mux.com/abc.m3u8');
  });

  it('calls onRemove when the remove button is clicked', () => {
    const onRemove = vi.fn();
    const item = makeNewMediaItem(new File(['x'], 'a.jpg', { type: 'image/jpeg' }));
    render(<MediaUploader items={[item]} onRemove={onRemove} />);
    const removeBtn = screen.getByTitle('Remove');
    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  it('shows trim control for new videos and crop for new images', () => {
    const videoItem = makeNewMediaItem(new File(['x'], 'v.mp4', { type: 'video/mp4' }));
    const imageItem = makeNewMediaItem(new File(['x'], 'a.jpg', { type: 'image/jpeg' }));
    render(
      <MediaUploader items={[videoItem, imageItem]} onRemove={() => {}} onTrim={() => {}} onCrop={() => {}} />
    );
    expect(screen.getByTitle('Trim Video')).toBeInTheDocument();
    expect(screen.getByTitle('Crop Image')).toBeInTheDocument();
  });

  it('renders the action overlay always visible (no hover-gating)', () => {
    const item = makeNewMediaItem(new File(['x'], 'a.jpg', { type: 'image/jpeg' }));
    const { container } = render(<MediaUploader items={[item]} onRemove={() => {}} onEdit={() => {}} onCrop={() => {}} />);
    const overlay = container.querySelector('.absolute.inset-0');
    expect(overlay).not.toBeNull();
    expect(overlay!.className).not.toContain('opacity-0');
    expect(overlay!.className).not.toContain('group-hover');
  });

  it('hides trim/crop for existing media and shows restore for removed items', () => {
    const onRestore = vi.fn();
    const existing = makeExistingMediaItem('https://cloudinary.test/img.jpg');
    const removed = { ...existing, removed: true };
    render(
      <MediaUploader items={[removed]} onRemove={() => {}} onRestore={onRestore} onTrim={() => {}} onCrop={() => {}} />
    );
    expect(screen.queryByTitle('Trim Video')).toBeNull();
    expect(screen.queryByTitle('Crop Image')).toBeNull();
    const restoreBtn = screen.getByTitle('Keep media');
    fireEvent.click(restoreBtn);
    expect(onRestore).toHaveBeenCalledWith(0);
  });
});

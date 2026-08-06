import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReplyPreview from './ReplyPreview';

describe('ReplyPreview', () => {
  it('renders nothing when there is no real reply', () => {
    const { container } = render(<ReplyPreview variant="inline" replyTo={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders sender name and text in inline variant', () => {
    render(
      <ReplyPreview
        variant="inline"
        replyTo={{ _id: '1', sender: { name: 'Ann' }, messageType: 'text', text: 'hello there' }}
      />
    );
    expect(screen.getByText('Ann')).toBeInTheDocument();
    expect(screen.getByText('hello there')).toBeInTheDocument();
  });

  it('shows the unavailable label for deleted originals', () => {
    render(
      <ReplyPreview
        variant="inline"
        replyTo={{ _id: '1', sender: { name: 'Ann' }, deleted: true }}
      />
    );
    expect(screen.getByText('Original message unavailable')).toBeInTheDocument();
  });

  it('renders an image thumbnail for image replies', () => {
    render(
      <ReplyPreview
        variant="compose"
        replyTo={{
          _id: '1',
          sender: { name: 'Ann' },
          messageType: 'image',
          mediaUrl: 'https://img.example.com/photo.jpg',
        }}
      />
    );
    const img = screen.getByAltText('Preview') as HTMLImageElement;
    expect(img.src).toContain('photo.jpg');
  });

  it('falls back to a label when no caption exists', () => {
    render(
      <ReplyPreview
        variant="inline"
        replyTo={{ _id: '1', sender: { name: 'Ann' }, messageType: 'video' }}
      />
    );
    expect(screen.getByText('Video')).toBeInTheDocument();
  });

  it('invokes onOpenOriginal when the inline preview is clicked', () => {
    const onOpenOriginal = vi.fn();
    render(
      <ReplyPreview
        variant="inline"
        replyTo={{ _id: '1', sender: { name: 'Ann' }, messageType: 'text', text: 'x' }}
        onOpenOriginal={onOpenOriginal}
      />
    );
    screen.getByText('Ann').click();
    expect(onOpenOriginal).toHaveBeenCalledTimes(1);
  });
});

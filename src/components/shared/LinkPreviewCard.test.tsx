import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import LinkPreviewCard from './LinkPreviewCard';

vi.mock('../../lib/linkPreview', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/linkPreview')>();
  return { ...actual, getLinkPreview: vi.fn() };
});

const { getLinkPreview } = await import('../../lib/linkPreview');

describe('LinkPreviewCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when text has no URL', () => {
    const { container } = render(<LinkPreviewCard text="no links here" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows a loading state while fetching', () => {
    (getLinkPreview as any).mockReturnValue(new Promise(() => {}));
    render(<LinkPreviewCard text="check https://example.com" />);
    expect(screen.getByText(/loading preview/i)).toBeInTheDocument();
  });

  it('renders title, description and site name when loaded', async () => {
    (getLinkPreview as any).mockResolvedValue({
      url: 'https://example.com/article',
      domain: 'example.com',
      title: 'Example Article',
      description: 'A great read',
      image: 'https://cdn.example.com/pic.png',
      siteName: 'Example Site',
    });
    render(<LinkPreviewCard text="https://example.com/article" />);
    expect(await screen.findByText('Example Article')).toBeInTheDocument();
    expect(screen.getByText('A great read')).toBeInTheDocument();
    expect(screen.getByText('Example Site')).toBeInTheDocument();
  });

  it('falls back to a domain chip when the preview is null', async () => {
    (getLinkPreview as any).mockResolvedValue(null);
    render(<LinkPreviewCard text="https://example.com" />);
    expect(await screen.findByText('example.com')).toBeInTheDocument();
  });

  it('opens the URL in a new tab on click', async () => {
    (getLinkPreview as any).mockResolvedValue({ url: 'https://example.com', domain: 'example.com' });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<LinkPreviewCard text="https://example.com" />);
    const link = await screen.findByRole('link', { name: /example\.com/ });
    link.click();
    expect(openSpy).toHaveBeenCalledWith('https://example.com/', '_blank', 'noopener,noreferrer');
  });
});

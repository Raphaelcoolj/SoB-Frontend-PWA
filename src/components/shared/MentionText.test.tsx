import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MentionText from './MentionText';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('MentionText', () => {
  it('renders URLs as clickable links in the default mode', () => {
    render(<MentionText text="visit https://example.com now" />);
    const link = screen.getByRole('link', { name: 'https://example.com' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders hashtags and mentions as internal links by default', () => {
    render(<MentionText text="hi @john see #tech" />);
    expect(screen.getByRole('link', { name: '@john' })).toHaveAttribute('href', '/profile/john');
    expect(screen.getByRole('link', { name: '#tech' })).toHaveAttribute('href', '/search?tag=tech');
  });

  it('keeps hashtags and mentions as plain text in linksOnly mode', () => {
    const { container } = render(<MentionText linksOnly text="hi @john see #tech https://example.com" />);
    expect(screen.queryByRole('link', { name: '@john' })).toBeNull();
    expect(screen.queryByRole('link', { name: '#tech' })).toBeNull();
    expect(screen.getByRole('link', { name: 'https://example.com' })).toBeTruthy();
    expect(container).toHaveTextContent('hi @john see #tech');
  });

  it('applies a custom linkClassName to URL anchors', () => {
    render(<MentionText text="https://example.com" linkClassName="text-white underline" />);
    expect(screen.getByRole('link', { name: 'https://example.com' })).toHaveClass('text-white underline');
  });

  it('renders as a span when as="span" is set', () => {
    const { container } = render(<MentionText as="span" text="hello https://example.com" />);
    expect(container.querySelector('span')).toBeTruthy();
    expect(container.querySelector('p')).toBeNull();
  });
});

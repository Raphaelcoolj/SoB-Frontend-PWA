import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PWAInstallInstructions from './PWAInstallInstructions';

describe('PWAInstallInstructions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    const { container } = render(<PWAInstallInstructions open={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the dialog with the three iOS steps when open', () => {
    render(<PWAInstallInstructions open onClose={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Install SoB on your iPhone')).toBeInTheDocument();
    expect(screen.getByText('Tap the Share button')).toBeInTheDocument();
    expect(screen.getByText('Select Add to Home Screen')).toBeInTheDocument();
    expect(screen.getByText('Tap Add')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Got it' })).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<PWAInstallInstructions open onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes via the Got it button', () => {
    const onClose = vi.fn();
    render(<PWAInstallInstructions open onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes via the close button', () => {
    const onClose = vi.fn();
    render(<PWAInstallInstructions open onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close install instructions' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

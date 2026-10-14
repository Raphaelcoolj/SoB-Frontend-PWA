import React from 'react';

export type VerificationType = 'none' | 'blue' | 'gold' | 'silver';

interface VerificationBadgeProps {
  type: VerificationType;
  size?: number;
  className?: string;
}

const COLORS: Record<Exclude<VerificationType, 'none'>, string> = {
  blue: '#1D9BF0',
  gold: '#E8A33D',
  silver: '#9CA3AF',
};

const LABELS: Record<Exclude<VerificationType, 'none'>, string> = {
  blue: 'Verified account',
  gold: 'Gold verified account',
  silver: 'Silver verified account',
};

/**
 * Industry-standard verification tick — a filled 12-point starburst
 * (scalloped seal) with a white checkmark, rendered as inline SVG.
 * One visible badge per account, server-authorized via
 * `User.verificationBadge`.
 *
 * Renders nothing for `type === 'none'`.
 */
const STARBURST =
  'M14.12 4.08 Q12.00 -2.00 17.80 6.20 Q19.00 -0.12 19.92 9.88 Q24.12 5.00 19.92 14.12 Q26.00 12.00 17.80 17.80 Q24.12 19.00 14.12 19.92 Q19.00 24.12 9.88 19.92 Q12.00 26.00 6.20 17.80 Q5.00 24.12 4.08 14.12 Q-0.12 19.00 4.08 9.88 Q-2.00 12.00 6.20 6.20 Q-0.12 5.00 9.88 4.08 Q5.00 -0.12 14.12 4.08 Z';

export default function VerificationBadge({ type, size = 14, className }: VerificationBadgeProps) {
  if (type === 'none') return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={LABELS[type]}
      className={className}
      style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}
    >
      <path d={STARBURST} fill={COLORS[type]} />
      <path
        d="M8 12.5l2.8 2.8L16.4 9"
        stroke="#FFFFFF"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

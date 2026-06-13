/**
 * @file UserAvatar.tsx
 * @description Renders a user's avatar with fallback initials.
 * Used across PostCard, CommentCard, notifications, etc.
 */

import React from 'react';

interface UserAvatarProps {
  avatar?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
};

export const UserAvatar = ({ avatar, name, size = 'md', className = '' }: UserAvatarProps) => {
  const sizeClass = SIZE_MAP[size];
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className={`${sizeClass} rounded-full bg-accent/20 border border-border flex items-center justify-center font-medium text-accent flex-shrink-0 overflow-hidden ${className}`}
    >
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

export default UserAvatar;


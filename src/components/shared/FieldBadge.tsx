/**
 * @file FieldBadge.tsx
 * @description Small colorful badge indicating the field/category of a post.
 * Used in PostCard, ArticleCard, and search results.
 */

import React from 'react';
import { Field } from '../../types/user';

interface FieldBadgeProps {
  field: Field | string;
}

// Maps common field slugs to accent colors for visual variety
const FIELD_COLORS: Record<string, string> = {
  science: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  math: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  technology: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  history: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  literature: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  economics: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  philosophy: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  medicine: 'bg-red-500/15 text-red-400 border-red-500/30',
  engineering: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  default: 'bg-accent/15 text-accent border-accent/30',
};

export const FieldBadge = ({ field }: FieldBadgeProps) => {
  if (!field || typeof field === 'string') {
    return null;
  }

  const colorClass = FIELD_COLORS[field.slug] || FIELD_COLORS.default;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider border ${colorClass}`}>
      {field.name}
    </span>
  );
};

export default FieldBadge;

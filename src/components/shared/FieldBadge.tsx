/**
 * @file FieldBadge.tsx
 * @description Small colorful badge indicating the field/category of a post.
 * Uses a deterministic color generator to ensure dynamic fields look consistent.
 */

import React from 'react';
import { Field } from '../../types/user';

interface FieldBadgeProps {
  field: Field | string;
}

/**
 * Deterministically generates a HSL color based on a string.
 * This ensures the same field always gets the same color, 
 * even if it was just added via the admin panel.
 */
const getFieldStyles = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  // We use HSL to ensure colors are always "vibrant" and "legible"
  // Hue: 0-360
  // Saturation: 60-80% (vibrant but not neon)
  // Lightness: 35-45% (dark enough for white text)
  const h = Math.abs(hash) % 360;
  const s = 70;
  const l = 40;

  return {
    backgroundColor: `hsl(${h}, ${s}%, ${l}%)`,
    borderColor: `hsl(${h}, ${s}%, ${l - 10}%)`,
    color: '#ffffff'
  };
};

export const FieldBadge = ({ field }: FieldBadgeProps) => {
  if (!field || typeof field === 'string') {
    return null;
  }

  const styles = getFieldStyles(field.name);

  return (
    <span 
      style={styles}
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm"
    >
      {field.name}
    </span>
  );
};

export default FieldBadge;

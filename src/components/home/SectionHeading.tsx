import React from 'react';

/**
 * @file SectionHeading.tsx
 * @description Shared heading block for homepage sections.
 */

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  id?: string;
}

export default function SectionHeading({ eyebrow, title, description, id }: SectionHeadingProps) {
  return (
    <div className="mb-6">
      {eyebrow && (
        <p className="text-sm font-semibold uppercase tracking-wider text-accent">{eyebrow}</p>
      )}
      <h2 id={id} className="mt-2 text-2xl md:text-3xl font-bold tracking-tight">
        {title}
      </h2>
      {description && <p className="mt-2 text-muted-foreground max-w-2xl">{description}</p>}
    </div>
  );
}

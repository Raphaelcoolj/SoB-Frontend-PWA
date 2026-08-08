import React from 'react';

/**
 * @file SectionMessage.tsx
 * @description Graceful empty/error message for homepage dynamic sections.
 */

interface SectionMessageProps {
  message: string;
}

export default function SectionMessage({ message }: SectionMessageProps) {
  return (
    <p className="rounded-xl border border-dashed border-border bg-card/30 px-4 py-8 text-center text-sm text-muted-foreground">
      {message}
    </p>
  );
}

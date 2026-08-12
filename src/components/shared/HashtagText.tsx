'use client';

import React from 'react';
import Link from 'next/link';

const HASHTAG_REGEX = /(?<!\w)(#\w{1,50})/g;

interface HashtagTextProps {
  text: string;
  className?: string;
  as?: 'p' | 'span';
}

export default function HashtagText({ text, className, as: Tag = 'p' }: HashtagTextProps) {
  if (!text) return null;

  const parts: React.ReactNode[] = [];
  const regex = new RegExp(HASHTAG_REGEX.source, HASHTAG_REGEX.flags);
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const tag = match[1].slice(1);
    parts.push(
      <Link
        key={match.index}
        href={`/search?tag=${encodeURIComponent(tag)}`}
        className="text-accent hover:underline font-medium"
      >
        {match[1]}
      </Link>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  if (parts.length === 0) {
    return <Tag className={className}>{text}</Tag>;
  }

  return <Tag className={className}>{parts}</Tag>;
}

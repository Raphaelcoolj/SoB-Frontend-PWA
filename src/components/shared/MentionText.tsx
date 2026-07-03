import React from 'react';
import Link from 'next/link';

const COMBINED_REGEX = /(?<!\w)(?:@(\w{3,30})(?!\w)|#(\w{1,50}))/g;

interface MentionTextProps {
  text: string;
  className?: string;
  as?: 'p' | 'span';
}

const MentionText: React.FC<MentionTextProps> = ({ text, className = '', as: Tag = 'p' }) => {
  if (!text) return null;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  COMBINED_REGEX.lastIndex = 0;

  while ((match = COMBINED_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      const username = match[1];
      parts.push(
        <Link
          key={match.index}
          href={`/profile/${username}`}
          className="text-accent hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          @{username}
        </Link>
      );
    } else if (match[2]) {
      const tag = match[2];
      parts.push(
        <Link
          key={match.index}
          href={`/search?tag=${encodeURIComponent(tag)}`}
          className="text-accent hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          #{tag}
        </Link>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  if (parts.length === 0) {
    return <Tag className={className}>{text}</Tag>;
  }

  return <Tag className={className}>{parts}</Tag>;
};

export default MentionText;

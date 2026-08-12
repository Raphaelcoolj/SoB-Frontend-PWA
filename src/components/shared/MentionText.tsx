import React from 'react';
import Link from 'next/link';

const URL_PATTERN =
  /(?:https?:\/\/|www\.)[^\s<>"']+|(?:[A-Za-z0-9][A-Za-z0-9-]*\.[A-Za-z]{2,})(?::\d+)?(?:[^\s<>"']*)?/;

const COMBINED_REGEX = new RegExp(
  `(?<!\\w)(?:@(\\w{3,30})(?!\\w)|#(\\w{1,50})|(${URL_PATTERN.source}))`,
  'g'
);

interface MentionTextProps {
  text: string;
  className?: string;
  as?: 'p' | 'span';
  linksOnly?: boolean;
  linkClassName?: string;
  /**
   * When provided, `@username` renders as a link only if the username exists
   * in this list (used for bios, where mentions may reference non-existent
   * users). Any other mention stays plain text. Pass the values exactly as
   * they appear after `@` (e.g. `bioMentions.map((m) => m.username)`).
   */
  validMentions?: string[];
}

const cleanUrl = (rawUrl: string): { href: string; display: string } => {
  let raw = rawUrl.trim();
  raw = raw.replace(/[)\]}>"']+$/, '').replace(/[.,;:!]+$/, '').replace(/&+$/, '');
  const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return { href, display: raw };
};

const MentionText: React.FC<MentionTextProps> = ({
  text,
  className = '',
  as: Tag = 'p',
  linksOnly = false,
  linkClassName,
  validMentions,
}) => {
  if (!text) return null;

  const validSet = validMentions ? new Set(validMentions) : null;

  const parts: React.ReactNode[] = [];
  const regex = new RegExp(COMBINED_REGEX.source, COMBINED_REGEX.flags);
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      if (linksOnly || (validSet && !validSet.has(match[1]))) {
        parts.push(text.slice(match.index, match.index + match[0].length));
      } else {
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
      }
    } else if (match[2]) {
      if (linksOnly) {
        parts.push(text.slice(match.index, match.index + match[0].length));
      } else {
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
    } else if (match[3]) {
      const { href, display } = cleanUrl(match[3]);
      parts.push(
        <a
          key={match.index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={
            linkClassName ??
            'text-accent underline underline-offset-2 hover:opacity-90 font-medium break-all'
          }
        >
          {display}
        </a>
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

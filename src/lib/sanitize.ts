import DOMPurify from 'isomorphic-dompurify';

// Render-sink defense for rich text (post/article bodies). Mirrors the
// backend write-boundary allowlist so even legacy stored bodies that predate
// server-side sanitization can never execute markup.
const ALLOWED_TAGS = [
  'p', 'br', 'hr',
  'strong', 'b', 'em', 'i', 'u', 's',
  'a',
  'ul', 'ol', 'li',
  'blockquote',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'code', 'pre', 'span',
];

const CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR: ['href', 'title', 'rel', 'target'],
  // Only safe schemes plus relative app links (/profile/..., /post/...).
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
};

export const safeHtml = (html: string | null | undefined): string =>
  DOMPurify.sanitize(html ?? '', CONFIG);
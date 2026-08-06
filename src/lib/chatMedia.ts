/**
 * @file chatMedia.ts
 * @description Shared chat media + reply-preview helpers used by the conversation
 * page and the reusable <ReplyPreview /> component. Centralizes message-type
 * detection and label generation so reply previews render consistently for
 * text, image, video, voice, document, poll and unsupported/deleted originals.
 */

export type ChatMediaType = 'image' | 'voice' | 'video' | 'document';
export type ReplyType = 'text' | 'image' | 'video' | 'voice' | 'document' | 'poll' | 'unsupported';

export interface MediaItem {
  type: ChatMediaType;
  url: string;
  duration?: number;
  filename?: string;
  mimeType?: string;
  size?: number;
}

export interface ReplyToData {
  _id?: string;
  text?: string;
  sender?: { _id?: string; name?: string; username?: string; avatar?: string };
  messageType?: ReplyType;
  mediaUrl?: string;
  filename?: string;
  mimeType?: string;
  caption?: string;
  deleted?: boolean;
  /** Legacy field sent by older clients; the backend now persists messageType. */
  mediaType?: ReplyType;
}

export interface ChatMessageLike {
  _id: string;
  text?: string;
  media?: MediaItem | MediaItem[];
  sender?: { _id?: string; name?: string; username?: string; avatar?: string };
  replyTo?: ReplyToData;
}

/**
 * Human-readable fallback label per reply type (no hardcoded strings in JSX).
 */
export const REPLY_LABELS: Record<ReplyType, string> = {
  text: 'Message',
  image: 'Photo',
  video: 'Video',
  voice: 'Voice note',
  document: 'Document',
  poll: 'Poll',
  unsupported: 'Unsupported message',
};

export const UNAVAILABLE_LABEL = 'Original message unavailable';

export const getMediaExt = (type: string) => {
  switch (type) {
    case 'image': return 'jpg';
    case 'video': return 'mp4';
    case 'document': return 'pdf';
    default: return 'bin';
  }
};

export const isPdf = (media: { filename?: string; mimeType?: string; url: string }) => {
  const name = (media.filename || '').toLowerCase();
  const mime = (media.mimeType || '').toLowerCase();
  return mime === 'application/pdf' || name.endsWith('.pdf') || media.url.toLowerCase().includes('.pdf');
};

export const getDocDisplayName = (media: { filename?: string; url: string }) => {
  if (media.filename && !media.filename.startsWith('http')) return media.filename;
  try {
    const url = new URL(media.url);
    const path = decodeURIComponent(url.pathname);
    const name = path.split('/').pop()?.split('?')[0] || '';
    return name ? name : 'Document';
  } catch {
    return media.filename || 'Document';
  }
};

export const getDocExt = (media: { mimeType?: string; filename?: string; url: string }): string => {
  const fn = media.filename || media.url || '';
  const mime = media.mimeType || '';
  if (mime.includes('pdf') || /\.pdf$/i.test(fn)) return 'PDF';
  if (mime.includes('word') || /\.(doc|docx)$/i.test(fn)) return 'DOC';
  if (mime.includes('sheet') || mime.includes('excel') || /\.(xls|xlsx|csv)$/i.test(fn)) return 'XLS';
  if (mime.includes('presentation') || /\.(ppt|pptx)$/i.test(fn)) return 'PPT';
  const m = fn.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toUpperCase() : 'FILE';
};

export const getDocExtBadge = (ext: string): string => {
  switch (ext) {
    case 'PDF': return 'bg-red-500/10 text-red-500';
    case 'DOC': return 'bg-blue-500/10 text-blue-400';
    case 'XLS': return 'bg-green-500/10 text-green-400';
    case 'PPT': return 'bg-orange-500/10 text-orange-400';
    default: return 'bg-foreground/5 text-foreground/60';
  }
};

export const getPdfFirstPageUrl = (media: { url: string }): string | null => {
  try {
    const u = new URL(media.url);
    if (u.hostname !== 'res.cloudinary.com') return null;
    const m = u.pathname.match(/^\/([^/]+)\/raw\/upload\//);
    if (!m) return null;
    const encoded = encodeURIComponent(media.url);
    return `https://res.cloudinary.com/${m[1]}/image/fetch/pg_1,w_300,f_jpg,q_auto/${encoded}`;
  } catch {
    return null;
  }
};

const firstMedia = (media: MediaItem | MediaItem[] | undefined): MediaItem | undefined => {
  if (!media) return undefined;
  return Array.isArray(media) ? media[0] : media;
};

/**
 * Resolve the type of the message a reply points at.
 * Prefers the persisted replyTo.messageType, then the legacy mediaType field,
 * then falls back to looking the original message up in the already-loaded list
 * (covers messages created before reply metadata existed).
 */
export const resolveReplyType = (
  replyTo: ReplyToData | null | undefined,
  messages: ChatMessageLike[]
): ReplyType => {
  if (!replyTo?._id) return 'text';
  if (replyTo.deleted) return 'unsupported';

  if (replyTo.messageType) return replyTo.messageType;

  if (replyTo.mediaType && replyTo.mediaType in REPLY_LABELS) return replyTo.mediaType;

  const original = messages.find((m) => m._id === replyTo._id);
  if (original) {
    const media = firstMedia(original.media);
    if (media?.type) return media.type;
  }
  return 'text';
};

export interface ResolvedReply {
  _id?: string;
  type: ReplyType;
  senderName: string;
  text: string;
  mediaUrl?: string;
  filename?: string;
}

/**
 * Build a normalized preview object for a reply. Returns null when the message
 * is not a genuine reply (missing _id). Deleted/unavailable originals resolve
 * to the "Original message unavailable" label.
 */
export const resolveReply = (
  replyTo: ReplyToData | null | undefined,
  messages: ChatMessageLike[]
): ResolvedReply | null => {
  if (!replyTo?._id) return null;

  const type = resolveReplyType(replyTo, messages);

  const original = messages.find((m) => m._id === replyTo._id);
  const origMedia = firstMedia(original?.media);

  const senderName = replyTo.sender?.name || '';
  const filename = replyTo.filename || origMedia?.filename;
  const mediaUrl = replyTo.mediaUrl || origMedia?.url;

  const caption = replyTo.caption ?? replyTo.text ?? '';

  let text: string;
  if (replyTo.deleted) {
    text = UNAVAILABLE_LABEL;
  } else if (caption) {
    text = caption;
  } else if (type === 'document' && filename) {
    text = filename;
  } else if (type === 'image' && filename) {
    text = filename;
  } else {
    text = REPLY_LABELS[type] || REPLY_LABELS.unsupported;
  }

  return {
    _id: replyTo._id,
    type,
    senderName,
    text,
    mediaUrl,
    filename,
  };
};

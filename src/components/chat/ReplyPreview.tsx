'use client';

/**
 * @file ReplyPreview.tsx
 * @description Reusable, memoized reply-preview component. Renders a preview of
 * the message being replied to according to its real type (text / image / video /
 * voice / document / poll / unsupported / deleted). Used in two variants:
 *  - "inline": compact indicator shown inside a message bubble.
 *  - "compose": taller preview bar shown above the composer while replying.
 * Supports dark mode and truncates gracefully on small screens.
 */

import React, { memo, useMemo } from 'react';
import { ImageIcon, Video, Mic, FileText, BarChart3, MessageSquare, HelpCircle, Play } from 'lucide-react';
import {
  ChatMessageLike,
  ReplyToData,
  ResolvedReply,
  resolveReply,
  REPLY_LABELS,
  UNAVAILABLE_LABEL,
} from '../../lib/chatMedia';

interface ReplyPreviewProps {
  variant: 'inline' | 'compose';
  replyTo: ReplyToData | null | undefined;
  messages?: ChatMessageLike[];
  mine?: boolean;
  onOpenOriginal?: () => void;
}

const TYPE_ICON = {
  text: MessageSquare,
  image: ImageIcon,
  video: Video,
  voice: Mic,
  document: FileText,
  poll: BarChart3,
  unsupported: HelpCircle,
} as const;

function ReplyPreviewInner({
  variant,
  replyTo,
  messages = [],
  mine = false,
  onOpenOriginal,
}: ReplyPreviewProps) {
  const resolved: ResolvedReply | null = useMemo(
    () => resolveReply(replyTo, messages),
    [replyTo, messages]
  );

  if (!resolved) return null;

  const { type, senderName, text, mediaUrl, filename } = resolved;
  const Icon = TYPE_ICON[type] || HelpCircle;
  const showThumb = mediaUrl && (type === 'image' || type === 'video');
  const unavailable = type === 'unsupported';
  const primaryColor = mine ? 'text-white/80' : 'text-accent';
  const secondaryColor = mine ? 'text-white/50' : 'text-muted-foreground/70';

  if (variant === 'inline') {
    return (
      <div
        className="px-2.5 pt-2 pb-0.5 cursor-pointer"
        onClick={onOpenOriginal}
      >
        <div className={`pl-2 border-l-2 ${mine ? 'border-white/40' : 'border-accent/60'}`}>
          <p className={`text-[11px] font-semibold truncate ${mine ? 'text-white/80' : 'text-accent'}`}>
            {senderName}
          </p>
          <div className="flex items-center gap-1.5 min-w-0">
            {showThumb && (
              <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0 bg-black/20 relative">
                <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
                {type === 'video' && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="w-2.5 h-2.5 text-white" />
                  </span>
                )}
              </div>
            )}
            {!showThumb && (
              <Icon className={`w-3 h-3 flex-shrink-0 ${mine ? 'text-white/50' : 'text-muted-foreground/70'}`} />
            )}
            <p className={`text-[11px] truncate ${unavailable ? (mine ? 'text-white/40' : 'text-muted-foreground/50') : secondaryColor}`}>
              {text}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Compose variant (reply bar above the input)
  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      {showThumb ? (
        <div className="w-9 h-9 rounded overflow-hidden flex-shrink-0 bg-black/10 relative">
          {type === 'image' ? (
            <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-black flex items-center justify-center">
              <Play className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
      ) : (
        <div
          className={`w-9 h-9 rounded flex items-center justify-center flex-shrink-0 ${
            type === 'document' ? 'bg-purple-500/10' : 'bg-accent/10'
          }`}
        >
          <Icon className={`w-4 h-4 ${type === 'document' ? 'text-purple-500' : 'text-accent'}`} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold truncate ${primaryColor}`}>{senderName}</p>
        <p className={`text-[11px] truncate ${unavailable ? 'text-muted-foreground/50' : 'text-muted-foreground/80'}`}>
          {text}
        </p>
      </div>
    </div>
  );
}

const ReplyPreview = memo(ReplyPreviewInner);
export default ReplyPreview;
export { REPLY_LABELS, UNAVAILABLE_LABEL };

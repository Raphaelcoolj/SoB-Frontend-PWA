'use client';

/**
 * @file PostShareDialog.tsx
 * @description Lets a user send a post to an existing SoB connection or share its link.
 */

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '../../lib/api';
import UserAvatar from '../user/UserAvatar';

interface ShareConnection {
  _id: string;
  name: string;
  username: string;
  avatar?: string;
}

interface PostShareDialogProps {
  postId: string;
  onClose: () => void;
  onShareLink: () => void;
}

export default function PostShareDialog({ postId, onClose, onShareLink }: PostShareDialogProps) {
  const [connections, setConnections] = useState<ShareConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');

  useEffect(() => {
    let active = true;
    fetchWithAuth('/api/users/connections', { method: 'GET' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.message || 'Could not load connections.');
        if (active) setConnections(payload.data.users || []);
      })
      .catch((error) => {
        if (active) toast.error(error.message || 'Could not load connections.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const sendToConnection = async (connection: ShareConnection) => {
    setSendingTo(connection._id);
    try {
      const conversationResponse = await fetchWithAuth(`/api/chats/with/${connection._id}`, { method: 'GET' });
      const conversationPayload = await conversationResponse.json();
      if (!conversationResponse.ok || !conversationPayload.success) {
        throw new Error(conversationPayload.message || 'Could not open this conversation.');
      }

      const conversationId = conversationPayload.data.conversation._id;
      const messageResponse = await fetchWithAuth(`/api/chats/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          sharedPostId: postId,
          clientMessageId: crypto.randomUUID(),
          text: messageText.trim(),
        }),
      });
      const messagePayload = await messageResponse.json();
      if (!messageResponse.ok || !messagePayload.success) {
        throw new Error(messagePayload.message || 'Could not send this post.');
      }

      const shareResponse = await fetchWithAuth(`/api/posts/${postId}/share`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (!shareResponse.ok) console.error('[PostShareDialog] Share counter update failed.');
      toast.success(`Post sent to ${connection.name}.`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send this post.');
    } finally {
      setSendingTo(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-post-title"
        className="w-full max-w-md rounded-t-2xl border border-border bg-background p-4 shadow-xl sm:rounded-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="share-post-title" className="text-base font-bold text-foreground">Share post</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <textarea
          aria-label="Optional message"
          value={messageText}
          onChange={(event) => setMessageText(event.target.value)}
          maxLength={1000}
          rows={2}
          placeholder="Add a message (optional)"
          className="mb-3 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <div className="max-h-72 overflow-y-auto">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading connections…</p>
          ) : connections.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No connections to share with yet.</p>
          ) : (
            connections.map((connection) => (
              <button
                key={connection._id}
                onClick={() => sendToConnection(connection)}
                disabled={sendingTo !== null}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-muted disabled:opacity-50"
              >
                <UserAvatar avatar={connection.avatar} name={connection.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{connection.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">@{connection.username}</span>
                </span>
                <span className="text-xs font-semibold text-accent">
                  {sendingTo === connection._id ? 'Sending…' : 'Send'}
                </span>
              </button>
            ))
          )}
        </div>
        <button
          onClick={() => { onClose(); onShareLink(); }}
          className="mt-3 w-full rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
        >
          Share link
        </button>
      </section>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, CheckCheck, Plus, Mic, X, ImageIcon } from 'lucide-react';
import useSWR from 'swr';
import { useAuthStore } from '../../../../store/authStore';
import { fetchWithAuth } from '../../../../lib/api';
import { socket, connectSocket } from '../../../../lib/socket';
import UserAvatar from '../../../../components/user/UserAvatar';

const BASE = process.env.NEXT_PUBLIC_API_URL;

const fetcher = (url: string) =>
  fetchWithAuth(url, { method: 'GET' }).then((r) => r.json()).then((d) => d.data);

interface MediaItem {
  type: 'image' | 'voice';
  url: string;
}

interface Message {
  _id: string;
  sender: { _id: string; name: string; username: string; avatar?: string };
  text: string;
  createdAt: string;
  readAt?: string;
  media?: MediaItem[];
}

interface ConversationData {
  conversation: {
    _id: string;
    otherUser: { _id: string; name: string; username: string; avatar?: string };
    unreadCount: number;
  };
}

function ChatConversation() {
  const params = useParams();
  const router = useRouter();
  const otherUserId = params.conversations as string;
  const { user: currentUser, accessToken } = useAuthStore();
  const [text, setText] = useState('');
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: convData, isLoading: convLoading } = useSWR<ConversationData>(
    otherUserId ? `${BASE}/api/chats/with/${otherUserId}` : null,
    fetcher
  );

  const conversationId = convData?.conversation?._id;

  const { data: msgData, isLoading: msgLoading, mutate: mutateMessages } = useSWR<{ messages: Message[]; pagination: any }>(
    conversationId ? `${BASE}/api/chats/${conversationId}/messages` : null,
    fetcher,
    { refreshInterval: 3000 }
  );

  const messages = msgData?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, localMessages]);

  useEffect(() => {
    if (!accessToken) return;
    connectSocket(accessToken);

    if (conversationId) {
      socket.emit('chat:join', conversationId);
      fetchWithAuth(`${BASE}/api/chats/${conversationId}/read`, { method: 'PUT' }).catch(() => {});
    }

    const handleMessage = (data: { conversationId: string; message: Message }) => {
      if (data.conversationId === conversationId) {
        setLocalMessages((prev) => [...prev, data.message]);
        fetchWithAuth(`${BASE}/api/chats/${conversationId}/read`, { method: 'PUT' }).catch(() => {});
        mutateMessages();
      }
    };

    socket.on('chat:message', handleMessage);

    return () => {
      if (conversationId) {
        socket.emit('chat:leave', conversationId);
      }
      socket.off('chat:message', handleMessage);
    };
  }, [conversationId, accessToken]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const displayedMessages = [...messages, ...localMessages].filter(
    (msg, i, arr) => i === arr.findIndex((m) => m._id === msg._id)
  );

  const handleSend = useCallback(async (mediaData?: MediaItem[]) => {
    const sendText = mediaData ? '' : text.trim();
    if ((!sendText && !mediaData) || sending || !conversationId) return;

    setSending(true);
    if (!mediaData) setText('');

    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      _id: tempId,
      sender: { _id: currentUser?._id || '', name: currentUser?.name || '', username: currentUser?.username || '', avatar: currentUser?.avatar },
      text: sendText,
      createdAt: new Date().toISOString(),
      media: mediaData,
    };
    setLocalMessages((prev) => [...prev, optimistic]);

    try {
      const res = await fetchWithAuth(`${BASE}/api/chats/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text: sendText, media: mediaData }),
      });
      const json = await res.json();
      if (json?.data?.message) {
        setLocalMessages((prev) => prev.filter((m) => m._id !== tempId));
        mutateMessages();
      }
    } catch {
      setLocalMessages((prev) => prev.filter((m) => m._id !== tempId));
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }, [text, sending, conversationId, currentUser, mutateMessages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadMedia = async () => {
    if (!selectedFile || !conversationId) return;
    setUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('conversationId', conversationId);
      const res = await fetchWithAuth(`${BASE}/api/chats/${conversationId}/upload`, {
        method: 'POST',
        body: formData,
        headers: {},
      });
      const json = await res.json();
      if (json?.data?.url) {
        await handleSend([{ type: 'image' as const, url: json.data.url }]);
      }
    } catch {
      //
    } finally {
      setUploadingMedia(false);
      setPreviewImage(null);
      setSelectedFile(null);
    }
  };

  if (convLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const otherUser = convData?.conversation?.otherUser;

  if (!otherUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground">User not found</p>
        <button onClick={() => router.push('/chats')} className="text-accent text-sm mt-2 hover:underline cursor-pointer">
          Back to chats
        </button>
      </div>
    );
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const groupedMessages = displayedMessages.reduce<{ date: string; messages: Message[] }[]>((acc, msg) => {
    const date = new Date(msg.createdAt).toLocaleDateString();
    const last = acc[acc.length - 1];
    if (last && last.date === date) {
      last.messages.push(msg);
    } else {
      acc.push({ date, messages: [msg] });
    }
    return acc;
  }, []);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] bg-background">
      <div className="flex items-center gap-3 pb-3 border-b border-border/40 -mx-4 px-4 mb-3">
        <button
          onClick={() => router.push('/chats')}
          className="p-1 -ml-1 rounded-full hover:bg-muted text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <UserAvatar avatar={otherUser.avatar} name={otherUser.name} size="sm" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{otherUser.name}</p>
          <p className="text-[11px] text-muted-foreground">@{otherUser.username}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 pb-4">
        {msgLoading && messages.length === 0 && localMessages.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-3 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : groupedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-3">
              <Send className="w-5 h-5 text-accent" />
            </div>
            <p className="text-sm text-muted-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Send a message to start the conversation</p>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.date}>
              <div className="flex justify-center my-3">
                <span className="text-[11px] font-medium text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
                  {new Date(group.date) >= new Date(new Date().setHours(0, 0, 0, 0))
                    ? 'Today'
                    : new Date(group.date) >= new Date(new Date().setDate(new Date().getDate() - 1))
                    ? 'Yesterday'
                    : group.date}
                </span>
              </div>
              {group.messages.map((msg) => {
                const isMine = msg.sender._id === currentUser?._id;
                const isTemp = msg._id.startsWith('temp-');
                return (
                  <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} px-4 mb-1 items-end gap-2`}>
                    {!isMine && (
                      <Link href={`/profile/${msg.sender.username}`} className="flex-shrink-0 self-end mb-1">
                        <UserAvatar avatar={msg.sender.avatar} name={msg.sender.name} size="xs" />
                      </Link>
                    )}
                    <div
                      className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl ${
                        isMine
                          ? 'bg-accent text-white rounded-br-md'
                          : 'bg-secondary/80 text-foreground rounded-bl-md'
                      }`}
                    >
                      {(() => {
                        const mediaItem = msg.media?.[0];
                        if (!mediaItem) return null;
                        if (mediaItem.type === 'image') return (
                          <div className="mb-1.5 -mx-3.5 -mt-2.5 rounded-t-2xl overflow-hidden">
                            <img src={mediaItem.url} alt="Image" className="w-full max-h-60 object-cover cursor-pointer" onClick={() => window.open(mediaItem.url, '_blank')} />
                          </div>
                        );
                        if (mediaItem.type === 'voice') return (
                          <div className="mb-1.5">
                            <audio controls className="w-full max-w-[200px] h-10" src={mediaItem.url} />
                          </div>
                        );
                        return null;
                      })()}
                      {msg.text && (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                      )}
                      <div className={`flex items-center justify-end gap-1 mt-0.5 ${isMine ? '' : ''}`}>
                        <span className={`text-[10px] ${isMine ? 'text-white/70' : 'text-muted-foreground'}`}>
                          {isTemp ? 'Sending...' : formatTime(msg.createdAt)}
                        </span>
                        {isMine && !isTemp && (
                          <CheckCheck className={`w-3 h-3 ${msg.readAt ? 'text-accent' : 'text-white/70'}`} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="sticky bottom-0 bg-background pt-2 pb-4 -mx-4 px-4 border-t border-border/40">
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-all flex-shrink-0 cursor-pointer"
          >
            <Plus className="w-5 h-5 text-muted-foreground" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => { setText(e.target.value); autoResize(e.target); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-secondary text-foreground placeholder:text-muted-foreground rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/50 transition-all resize-none min-h-[40px] max-h-[120px]"
            disabled={sending}
          />
          <button
            onClick={() => handleSend()}
            disabled={!text.trim() || sending}
            className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-all active:scale-95 cursor-pointer flex-shrink-0"
          >
            <Mic className="w-4 h-4" />
          </button>
        </div>
      </div>

      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
          <div className="bg-card border border-border rounded-2xl overflow-hidden max-w-lg w-full">
            <div className="relative">
              <img src={previewImage} alt="Preview" className="w-full max-h-80 object-contain" />
              <button
                onClick={() => { setPreviewImage(null); setSelectedFile(null); }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 p-3">
              <button
                onClick={() => { setPreviewImage(null); setSelectedFile(null); }}
                className="flex-1 py-2 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadMedia}
                disabled={uploadingMedia}
                className="flex-1 py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {uploadingMedia ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4" />
                    Send Image
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatConversationPage() {
  return <ChatConversation />;
}

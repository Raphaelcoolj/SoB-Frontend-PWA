'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, CheckCheck, Plus, Mic, X, ImageIcon, Play, Pause, StopCircle, Reply, CornerUpLeft, Crop } from 'lucide-react';
import useSWR from 'swr';
import { useAuthStore } from '../../../../store/authStore';
import { fetchWithAuth } from '../../../../lib/api';
import { socket, connectSocket } from '../../../../lib/socket';
import UserAvatar from '../../../../components/user/UserAvatar';
import ImageCropperModal from '../../../../components/post/ImageCropperModal';

const BASE = process.env.NEXT_PUBLIC_API_URL;

const fetcher = async (url: string) => {
  const res = await fetchWithAuth(url, { method: 'GET' })
  const json = await res.json()
  if (!res.ok || !json.success) {
    throw new Error(json.message || `Request failed (${res.status})`)
  }
  return json.data
}

interface Message {
  _id: string;
  sender: { _id: string; name: string; username: string; avatar?: string };
  text: string;
  createdAt: string;
  readAt?: string;
  media?:
    | { type: 'image' | 'voice'; url: string; duration?: number }
    | { type: 'image' | 'voice'; url: string; duration?: number }[];
  replyTo?: { _id: string; text: string; sender: { name: string } };
}

interface ConversationData {
  conversation: {
    _id: string;
    otherUser: { _id: string; name: string; username: string; avatar?: string };
    unreadCount: number;
  };
}

function VoiceBubble({ url, duration, isMine }: { url: string; duration?: number; isMine: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [tick, setTick] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(url);
    const a = audioRef.current;
    a.onended = () => { setPlaying(false); if (intervalRef.current) clearInterval(intervalRef.current); };
    return () => { a.pause(); a.src = ''; };
  }, [url]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      audioRef.current.play();
      setPlaying(true);
      intervalRef.current = setInterval(() => setTick(t => t + 1), 150);
    }
  };

  const len = duration ? `${Math.round(duration / 1000)}s` : '0s';
  // Static bar heights for idle state
  const idleHeights = [6, 10, 8, 14, 8, 12, 6, 10];

  return (
    <div className={`flex items-center gap-2 px-2.5 py-2 rounded-xl ${isMine ? 'bg-white/15' : 'bg-muted'} min-w-[120px] max-w-[200px]`}>
      <button onClick={toggle} className="flex-shrink-0 cursor-pointer">
        {playing ? (
          <Pause className={`w-5 h-5 ${isMine ? 'text-white' : 'text-accent'}`} />
        ) : (
          <Play className={`w-5 h-5 ${isMine ? 'text-white' : 'text-accent'}`} />
        )}
      </button>
      <div className="flex items-end gap-[2px] h-4 flex-1">
        {idleHeights.map((idle, i) => {
          const height = playing
            ? Math.max(4, Math.sin(tick / 6 + i * 0.9) * 6 + 10)
            : idle;
          return (
            <div
              key={i}
              className={`w-[3px] rounded-full transition-all duration-75 ${isMine ? 'bg-white/70' : 'bg-accent/60'}`}
              style={{ height: `${height}px` }}
            />
          );
        })}
      </div>
      <span className={`text-xs font-semibold tabular-nums ${isMine ? 'text-white/80' : 'text-muted-foreground'}`}>{len}</span>
    </div>
  );
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
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingTick, setRecordingTick] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<{ _id: string; text: string; sender: { name: string } } | null>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const touchStartXRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const convKey = otherUserId ? `${BASE}/api/chats/with/${otherUserId}` : null;
  const { data: convData, isLoading: convLoading, error: convError } = useSWR<ConversationData>(convKey, fetcher);
  const conversationId = convData?.conversation?._id;

  const msgKey = conversationId ? `${BASE}/api/chats/${conversationId}/messages` : null;
  const { data: msgData, isLoading: msgLoading, mutate: mutateMessages, error: msgError } = useSWR<{ messages: Message[] }>(
    msgKey, fetcher, { refreshInterval: 3000 }
  );

  const messages = msgData?.messages || [];

  const isOwnMessage = useCallback((senderId: string) => {
    return currentUser?._id ? senderId === currentUser._id : false;
  }, [currentUser]);

  const displayedMessages = React.useMemo(() => {
    return [...messages, ...localMessages].filter(
      (msg, i, arr) => i === arr.findIndex((m) => m._id === msg._id)
    );
  }, [messages, localMessages]);

  // Single scroll trigger on the combined deduplicated list
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedMessages]);

  useEffect(() => {
    if (!accessToken || !conversationId) return;
    connectSocket(accessToken);

    const joinRoom = () => {
      socket.emit('chat:join', conversationId);
    };

    if (socket.connected) {
      joinRoom();
    } else {
      socket.once('connect', joinRoom);
    }

    fetchWithAuth(`${BASE}/api/chats/${conversationId}/read`, { method: 'PUT' }).catch(() => {});

    const onMessage = (data: { conversationId: string; message: Message }) => {
      if (data.conversationId === conversationId && !isOwnMessage(data.message.sender._id)) {
        setLocalMessages((prev) => { if (prev.some(m => m._id === data.message._id)) return prev; return [...prev, data.message]; });
        fetchWithAuth(`${BASE}/api/chats/${conversationId}/read`, { method: 'PUT' }).catch(() => {});
        mutateMessages();
      }
    };
    socket.on('chat:message', onMessage);
    return () => {
      socket.emit('chat:leave', conversationId);
      socket.off('chat:message', onMessage);
    };
  }, [conversationId, accessToken, isOwnMessage, mutateMessages]);

  const resetTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleSend = useCallback(async (mediaData?: { type: 'image' | 'voice'; url: string }[]) => {
    const sendText = mediaData ? '' : text.trim();
    if ((!sendText && !mediaData) || sending || !conversationId || !currentUser) return;

    setSending(true);
    if (!mediaData) { setText(''); resetTextarea(); }

    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      _id: tempId,
      sender: { _id: currentUser._id, name: currentUser.name, username: currentUser.username, avatar: currentUser.avatar },
      text: sendText,
      createdAt: new Date().toISOString(),
      media: mediaData?.length ? mediaData[0] : undefined,
      replyTo: replyTo ? { _id: replyTo._id, text: replyTo.text, sender: replyTo.sender } : undefined,
    };
    setLocalMessages((prev) => [...prev, optimistic]);

    try {
      const res = await fetchWithAuth(`${BASE}/api/chats/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          text: sendText,
          media: mediaData?.length ? mediaData[0] : undefined,
          replyTo: replyTo ? { _id: replyTo._id, text: replyTo.text, sender: replyTo.sender } : undefined,
        }),
      });
      setLocalMessages((prev) => prev.filter((m) => m._id !== tempId));
      if (res.ok) {
        const json = await res.json();
        if (json?.data?.message) {
          mutateMessages();
          setReplyTo(null);
        }
      }
    } catch {
      setLocalMessages((prev) => prev.filter((m) => m._id !== tempId));
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }, [text, sending, conversationId, currentUser, mutateMessages, replyTo]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setIsCropperOpen(true);
    // Reset so same file can be re-selected
    e.target.value = '';
  };

  const handleCropComplete = (croppedFile: File) => {
    setIsCropperOpen(false);
    setSelectedFile(croppedFile);
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewImage(ev.target?.result as string);
    reader.readAsDataURL(croppedFile);
  };

  const handleUploadMedia = async () => {
    if (!selectedFile || !conversationId) return;
    setUploadingMedia(true);
    const sendText = text.trim();
    setText('');
    resetTextarea();
    try {
      const formData = new FormData();
      formData.append('media', selectedFile);
      if (sendText) formData.append('text', sendText);
      if (replyTo) formData.append('replyTo', JSON.stringify(replyTo));
      const res = await fetchWithAuth(`${BASE}/api/chats/${conversationId}/messages`, {
        method: 'POST', body: formData, headers: {},
      });
      const json = await res.json();
      if (json?.data?.message) { mutateMessages(); setReplyTo(null); }
    } catch { } finally {
      setUploadingMedia(false); setPreviewImage(null); setSelectedFile(null);
      textareaRef.current?.focus();
    }
  };

  if (convLoading) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-background md:pl-20 lg:pl-64">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (convError) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-background md:pl-20 lg:pl-64">
        <p className="text-destructive font-semibold text-lg">Error</p>
        <p className="text-muted-foreground text-sm mt-1 text-center max-w-xs">
          {convError instanceof Error ? convError.message : 'Failed to load conversation'}
        </p>
        <button onClick={() => router.push('/chats')} className="text-accent text-sm mt-2 hover:underline cursor-pointer">
          Back to chats
        </button>
      </div>
    );
  }

  const otherUser = convData?.conversation?.otherUser;

  if (!otherUser) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-background md:pl-20 lg:pl-64">
        <p className="text-muted-foreground">User not found</p>
        <button onClick={() => router.push('/chats')} className="text-accent text-sm mt-1 hover:underline cursor-pointer">
          Back to chats
        </button>
      </div>
    );
  }

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatDateLabel = (isoDate: string) => {
    // isoDate is already YYYY-MM-DD, safe to append time
    const d = new Date(`${isoDate}T00:00:00`);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  // Use ISO date (YYYY-MM-DD) as the group key — locale-independent and parseable
  const groupedMessages = displayedMessages.reduce<{ date: string; messages: Message[] }[]>((acc, msg) => {
    if (!msg.createdAt) return acc;
    const d = new Date(msg.createdAt);
    if (isNaN(d.getTime())) return acc;
    // e.g. "2026-07-19"
    const date = d.toISOString().slice(0, 10);
    const last = acc[acc.length - 1];
    if (last && last.date === date) { last.messages.push(msg); }
    else { acc.push({ date, messages: [msg] }); }
    return acc;
  }, []);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  // Static waveform bar heights for recording animation
  const waveHeights = Array.from({ length: 24 }, (_, i) => i);

  return (
    // Break out of main layout's max-width/padding by using fixed positioning
    <div className="fixed inset-0 z-40 flex flex-col bg-background md:pl-20 lg:pl-64">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 flex-shrink-0 bg-background/95 backdrop-blur-sm">
        <button
          onClick={() => router.push('/chats')}
          className="p-1.5 -ml-1 rounded-full hover:bg-muted text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Link href={`/profile/${otherUser.username}`} className="flex items-center gap-2.5 min-w-0 flex-1">
          <UserAvatar avatar={otherUser.avatar} name={otherUser.name} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{otherUser.name}</p>
            <p className="text-[11px] text-muted-foreground">@{otherUser.username}</p>
          </div>
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 scroll-smooth">
        {msgLoading && messages.length === 0 && localMessages.length === 0 ? (
          /* Loading skeleton */
          <div className="space-y-4 pt-4">
            {[70, 50, 80, 40, 65].map((w, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                {i % 2 !== 0 && <div className="w-6 h-6 rounded-full bg-secondary animate-pulse flex-shrink-0" />}
                <div
                  className="h-9 rounded-2xl bg-secondary animate-pulse"
                  style={{ width: `${w}%`, maxWidth: '68%' }}
                />
              </div>
            ))}
          </div>
        ) : groupedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
              <Send className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">No messages yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Send a message to start the conversation</p>
            </div>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex justify-center my-4">
                <span className="text-[11px] font-medium text-muted-foreground/60 bg-muted/60 px-3 py-1 rounded-full select-none">
                  {formatDateLabel(group.date)}
                </span>
              </div>

              <div className="space-y-1.5">
                {group.messages.map((msg) => {
                  const mine = isOwnMessage(msg.sender._id);
                  const isTemp = msg._id.startsWith('temp-');
                  const mediaItem = Array.isArray(msg.media) ? msg.media[0] : msg.media;

                  return (
                    <div
                      key={msg._id}
                      className={`flex ${mine ? 'justify-end' : 'justify-start'} items-end gap-2 group`}
                      onMouseEnter={() => setHoveredMsgId(msg._id)}
                      onMouseLeave={() => setHoveredMsgId(null)}
                      onTouchStart={(e) => { touchStartXRef.current = e.touches[0].clientX; }}
                      onTouchMove={(e) => {
                        const delta = e.touches[0].clientX - touchStartXRef.current;
                        if (delta > 50 && !isTemp) {
                          setReplyTo({ _id: msg._id, text: msg.text || (mediaItem?.type === 'image' ? 'Sent an image' : mediaItem?.type === 'voice' ? 'Sent a voice note' : ''), sender: { name: msg.sender.name } });
                          touchStartXRef.current = Infinity;
                        }
                      }}
                    >
                      {/* Receiver avatar (left side) */}
                      {!mine && (
                        <Link href={`/profile/${msg.sender.username}`} className="flex-shrink-0 self-end mb-0.5">
                          <UserAvatar avatar={msg.sender.avatar} name={msg.sender.name} size="xs" />
                        </Link>
                      )}

                      {/* Hover reply button — left of mine bubble, right of other bubble */}
                      {mine && hoveredMsgId === msg._id && !isTemp && (
                        <button
                          onClick={() => setReplyTo({ _id: msg._id, text: msg.text || (mediaItem?.type === 'image' ? 'Sent an image' : mediaItem?.type === 'voice' ? 'Sent a voice note' : ''), sender: { name: msg.sender.name } })}
                          className="flex-shrink-0 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-accent transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                        >
                          <CornerUpLeft className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Bubble */}
                      <div
                        className={`max-w-[68%] w-fit rounded-2xl overflow-hidden relative ${
                          mediaItem?.type === 'image' && !msg.text
                            ? 'bg-transparent shadow-none'
                            : mine
                            ? 'bg-accent text-white rounded-br-[4px] shadow-sm'
                            : 'bg-secondary text-foreground rounded-bl-[4px] shadow-sm'
                        } ${isTemp ? 'opacity-70' : ''}`}
                      >
                        {/* Reply indicator */}
                        {msg.replyTo && (
                          <div className="px-3.5 pt-2.5 pb-1">
                            <div className={`pl-2.5 border-l-2 ${mine ? 'border-white/40' : 'border-accent/60'}`}>
                              <p className={`text-[11px] font-semibold truncate ${mine ? 'text-white/80' : 'text-accent'}`}>
                                {msg.replyTo.sender.name}
                              </p>
                              <p className={`text-[11px] truncate ${mine ? 'text-white/50' : 'text-muted-foreground/70'}`}>
                                {msg.replyTo.text}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Image */}
                        {mediaItem?.type === 'image' && (
                          <img
                            src={mediaItem.url}
                            alt="Image"
                            className="w-full max-h-[350px] object-contain bg-black/5 cursor-pointer rounded-2xl"
                            onClick={() => window.open(mediaItem.url, '_blank')}
                          />
                        )}

                        {/* Voice */}
                        {mediaItem?.type === 'voice' && (
                          <div className="px-3 py-2">
                            <VoiceBubble url={mediaItem.url} duration={mediaItem.duration} isMine={mine} />
                          </div>
                        )}

                        {/* Text */}
                        {msg.text && (
                          <div className={`px-3.5 ${mediaItem ? 'pt-1.5 pb-1' : 'pt-2.5 pb-1'}`}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                          </div>
                        )}

                        {/* Timestamp + read receipt */}
                        <div className={
                          mediaItem?.type === 'image' && !msg.text
                            ? "absolute bottom-2 right-2 bg-black/55 px-1.5 py-0.5 rounded-lg flex items-center gap-1 text-white text-[10px]"
                            : "px-3.5 pb-2 flex items-center justify-end gap-1"
                        }>
                          <span className={mediaItem?.type === 'image' && !msg.text ? 'text-white/90' : mine ? 'text-white/60' : 'text-muted-foreground/60'}>
                            {isTemp ? 'Sending...' : formatTime(msg.createdAt)}
                          </span>
                          {mine && !isTemp && (
                            <CheckCheck className={`w-3.5 h-3.5 ${mediaItem?.type === 'image' && !msg.text ? 'text-white/90' : msg.readAt ? 'text-blue-300' : 'text-white/50'}`} />
                          )}
                        </div>
                      </div>

                      {/* Hover reply button — right of receiver bubble */}
                      {!mine && hoveredMsgId === msg._id && !isTemp && (
                        <button
                          onClick={() => setReplyTo({ _id: msg._id, text: msg.text || (mediaItem?.type === 'image' ? 'Sent an image' : mediaItem?.type === 'voice' ? 'Sent a voice note' : ''), sender: { name: msg.sender.name } })}
                          className="flex-shrink-0 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-accent transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                        >
                          <CornerUpLeft className="w-3.5 h-3.5 scale-x-[-1]" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply bar */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-accent/5 border-t border-accent/10 flex-shrink-0">
          <div className="w-0.5 h-8 rounded-full bg-accent flex-shrink-0" />
          <Reply className="w-3.5 h-3.5 text-accent flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-accent truncate">{replyTo.sender.name}</p>
            <p className="text-[11px] text-muted-foreground/70 truncate">{replyTo.text}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="flex-shrink-0 bg-background/95 backdrop-blur-sm border-t border-border/50 px-4 py-3">
        <div className="flex items-end gap-2">
          {/* Attach button — hidden during recording/voice preview */}
          {!isRecording && !recordedAudioUrl && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-all flex-shrink-0 cursor-pointer"
            >
              <Plus className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

          {/* Recording waveform bar */}
          {isRecording && (
            <div className="flex-1 flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-2xl px-3 py-2 h-10">
              <div className="flex items-end gap-[2px] h-5 flex-1">
                {waveHeights.map((i) => (
                  <div
                    key={i}
                    className="w-[3px] rounded-full bg-destructive transition-all duration-75"
                    style={{
                      height: `${Math.max(4, Math.abs(Math.sin(recordingTick / 8 + i * 0.7) * 10 + Math.sin(recordingTick / 13 + i * 1.1) * 6 + 12))}px`,
                    }}
                  />
                ))}
              </div>
              <span className="text-sm font-mono font-medium text-destructive tabular-nums flex-shrink-0">
                {String(Math.floor(recordingDuration / 60)).padStart(2, '0')}:{String(recordingDuration % 60).padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Voice preview */}
          {recordedAudioUrl && (
            <div className="flex-1 flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-2xl px-3 py-2 h-10">
              <Mic className="w-4 h-4 text-accent flex-shrink-0" />
              <span className="text-sm text-accent font-medium flex-1">Voice note ready</span>
              <span className="text-xs text-accent/70 tabular-nums">
                {String(Math.floor(recordingDuration / 60)).padStart(2, '0')}:{String(recordingDuration % 60).padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Text input */}
          {!isRecording && !recordedAudioUrl && (
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => { setText(e.target.value); autoResize(e.target); }}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 bg-secondary text-foreground placeholder:text-muted-foreground/60 rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/30 transition-all resize-none min-h-[40px] max-h-[120px]"
              disabled={sending}
            />
          )}

          {/* Right action button */}
          {isRecording ? (
            <button
              onClick={() => {
                recorderRef.current?.stop();
                if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
                setIsRecording(false);
              }}
              className="w-10 h-10 rounded-full bg-destructive text-white flex items-center justify-center hover:opacity-90 transition-all active:scale-95 cursor-pointer flex-shrink-0"
            >
              <StopCircle className="w-5 h-5" />
            </button>
          ) : recordedAudioUrl ? (
            <div className="flex gap-1.5">
              <button
                onClick={() => { setRecordedAudioUrl(null); setRecordingDuration(0); }}
                className="w-10 h-10 rounded-full bg-secondary text-muted-foreground flex items-center justify-center hover:bg-secondary/80 transition-all active:scale-95 cursor-pointer flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={async () => {
                  if (!recordedAudioUrl || !conversationId) return;
                  try {
                    const blob = await fetch(recordedAudioUrl).then(r => r.blob());
                    const formData = new FormData();
                    formData.append('media', blob, 'voice.mp3');
                    formData.append('text', '');
                    setSending(true);
                    setRecordedAudioUrl(null);
                    setRecordingDuration(0);
                    const res = await fetchWithAuth(`${BASE}/api/chats/${conversationId}/messages`, { method: 'POST', body: formData, headers: {} });
                    const json = await res.json();
                    if (json?.data?.message) mutateMessages();
                  } catch { } finally { setSending(false); textareaRef.current?.focus(); }
                }}
                disabled={sending}
                className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center hover:opacity-90 transition-all active:scale-95 cursor-pointer flex-shrink-0 disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          ) : text.trim() ? (
            <button
              onClick={() => handleSend()}
              disabled={sending}
              className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center hover:opacity-90 transition-all active:scale-95 cursor-pointer flex-shrink-0 disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={async () => {
                try {
                  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                  const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                  const chunks: Blob[] = [];
                  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
                  recorder.onstop = () => {
                    stream.getTracks().forEach(t => t.stop());
                    setRecordedAudioUrl(URL.createObjectURL(new Blob(chunks, { type: 'audio/webm' })));
                  };
                  recorder.start();
                  recorderRef.current = recorder;
                  setIsRecording(true);
                  setRecordingDuration(0);
                  setRecordingTick(0);
                  const startTime = Date.now();
                  recordingTimerRef.current = setInterval(() => {
                    setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
                    setRecordingTick(t => t + 1);
                  }, 150);
                } catch { }
              }}
              className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center hover:opacity-90 transition-all active:scale-95 cursor-pointer flex-shrink-0"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Image preview modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
          <div className="bg-card border border-border rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl">
            <div className="relative">
              <img src={previewImage} alt="Preview" className="w-full max-h-80 object-contain bg-black/50" />
              <button
                onClick={() => { setPreviewImage(null); setSelectedFile(null); }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center cursor-pointer hover:bg-black/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 p-3">
              <button
                onClick={() => { setPreviewImage(null); setSelectedFile(null); }}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadMedia}
                disabled={uploadingMedia}
                className="flex-1 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {uploadingMedia ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><ImageIcon className="w-4 h-4" /> Send Image</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Cropper Modal */}
      {selectedFile && isCropperOpen && (
        <ImageCropperModal
          file={selectedFile}
          isOpen={isCropperOpen}
          onClose={() => {
            setIsCropperOpen(false);
            setSelectedFile(null);
          }}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}

export default function ChatConversationPage() {
  return <ChatConversation />;
}

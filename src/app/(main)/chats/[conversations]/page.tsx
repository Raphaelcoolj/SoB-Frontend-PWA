'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, CheckCheck, Plus, Mic, X, ImageIcon, FileText, Play, Pause, StopCircle, Reply, CornerUpLeft, Crop, File, Download, Trash2, MoreVertical, Clock } from 'lucide-react';
import useSWR from 'swr';
import { useAuthStore } from '../../../../store/authStore';
import { fetchWithAuth } from '../../../../lib/api';
import { socket, connectSocket } from '../../../../lib/socket';
import UserAvatar from '../../../../components/user/UserAvatar';
import ConversationsSidebar from '../../../../components/layout/ConversationsSidebar';
import ImageCropperModal from '../../../../components/post/ImageCropperModal';
import VideoTrimmerModal from '../../../../components/post/VideoTrimmerModal';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { formatFileSize } from '../../../../lib/utils';

const ImageLightbox = dynamic(() => import('../../../../components/post/ImageLightbox'), { ssr: false });

const BASE = process.env.NEXT_PUBLIC_API_URL;

const getMediaExt = (type: string) => {
  switch (type) {
    case 'image': return 'jpg';
    case 'video': return 'mp4';
    case 'document': return 'pdf';
    default: return 'bin';
  }
};

const isPdf = (media: { filename?: string; mimeType?: string; url: string }) => {
  const name = (media.filename || '').toLowerCase();
  const mime = (media.mimeType || '').toLowerCase();
  return mime === 'application/pdf' || name.endsWith('.pdf') || media.url.toLowerCase().includes('.pdf');
};

const getDocDisplayName = (media: { filename?: string; url: string }) => {
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

const getDocExt = (media: { mimeType?: string; filename?: string; url: string }): string => {
  const fn = media.filename || media.url || '';
  const mime = media.mimeType || '';
  if (mime.includes('pdf') || /\.pdf$/i.test(fn)) return 'PDF';
  if (mime.includes('word') || /\.(doc|docx)$/i.test(fn)) return 'DOC';
  if (mime.includes('sheet') || mime.includes('excel') || /\.(xls|xlsx|csv)$/i.test(fn)) return 'XLS';
  if (mime.includes('presentation') || /\.(ppt|pptx)$/i.test(fn)) return 'PPT';
  const m = fn.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toUpperCase() : 'FILE';
};

const getDocExtBadge = (ext: string): string => {
  switch (ext) {
    case 'PDF': return 'bg-red-500/10 text-red-500';
    case 'DOC': return 'bg-blue-500/10 text-blue-400';
    case 'XLS': return 'bg-green-500/10 text-green-400';
    case 'PPT': return 'bg-orange-500/10 text-orange-400';
    default: return 'bg-foreground/5 text-foreground/60';
  }
};

const getPdfFirstPageUrl = (media: { url: string }): string | null => {
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

function PdfPreview({ url, fallback }: { url: string; fallback: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return (
    <img
      src={url}
      alt="Document first page"
      loading="lazy"
      className="w-full h-40 bg-white object-contain"
      onError={() => setFailed(true)}
    />
  );
}

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
    | { type: 'image' | 'voice' | 'video' | 'document'; url: string; duration?: number; filename?: string; mimeType?: string; size?: number }
    | { type: 'image' | 'voice' | 'video' | 'document'; url: string; duration?: number; filename?: string; mimeType?: string; size?: number }[];
  replyTo?: { _id: string; text: string; sender: { name: string }; mediaUrl?: string; mediaType?: string };
  reactions?: Record<string, string>;
  isEdited?: boolean;
  deleted?: boolean;
  deletedFor?: string[];
}

type MediaItem = {
  type: 'image' | 'voice' | 'video' | 'document';
  url: string;
  duration?: number;
  filename?: string;
  mimeType?: string;
  size?: number;
};

interface ConversationData {
  conversation: {
    _id: string;
    otherUser: { _id: string; name: string; username: string; avatar?: string };
    unreadCount: number;
    isBlocked?: boolean;
    neverDeleteMessages?: boolean;
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
  const [isVideoTrimmerOpen, setIsVideoTrimmerOpen] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingTick, setRecordingTick] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<{ _id: string; text: string; sender: { name: string }; mediaUrl?: string; mediaType?: string } | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; messageIds: string[] }>({ open: false, messageIds: [] });
  const [actionSheetMsg, setActionSheetMsg] = useState<Message | null>(null);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const touchStartXRef = useRef(0);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const convKey = otherUserId ? `${BASE}/api/chats/with/${otherUserId}` : null;
  const { data: convData, isLoading: convLoading, error: convError, mutate: mutateConv } = useSWR<ConversationData>(convKey, fetcher);
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
    const onRead = (data: { conversationId: string; readAt: string; readerId: string }) => {
      if (data.conversationId !== conversationId) return;
      const readAt = data.readAt;
      setLocalMessages((prev) => prev.map((m) => (m.sender._id === currentUser?._id && !m.readAt ? { ...m, readAt } : m)));
      mutateMessages();
    };
    socket.on('chat:message', onMessage);
    socket.on('chat:read', onRead);
    return () => {
      socket.emit('chat:leave', conversationId);
      socket.off('chat:message', onMessage);
      socket.off('chat:read', onRead);
    };
  }, [conversationId, accessToken, isOwnMessage, mutateMessages, currentUser?._id]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setChatMenuOpen(false);
      }
    };
    if (chatMenuOpen) {
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }
  }, [chatMenuOpen]);

  const handleScrollToMessage = (id: string) => {
    const el = messageRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-muted/50', 'transition-colors', 'duration-500');
      setTimeout(() => el.classList.remove('bg-muted/50'), 1500);
    }
  };

  const handleReactToMessage = (msgId: string, emoji: string) => {
    // Optimistic update
    setLocalMessages(prev => prev.map(m => {
      if (m._id === msgId) {
        const reactions = { ...m.reactions };
        const myId = currentUser?._id || '';
        if (reactions[myId] === emoji) delete reactions[myId];
        else reactions[myId] = emoji;
        return { ...m, reactions };
      }
      return m;
    }));
    // Send to server
    if (conversationId) {
      fetchWithAuth(`${BASE}/api/chats/${conversationId}/messages/${msgId}/react`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      }).catch(() => {});
    }
  };

  const handleCopy = (msgText: string) => {
    navigator.clipboard.writeText(msgText);
  };

  const handleDelete = (msgId: string) => {
    setLocalMessages(prev => prev.filter(m => m._id !== msgId));
  };

  const handleDownloadMedia = (media: MediaItem, msgId: string) => {
    if (!media?.url) return;
    if (downloadProgress[msgId] !== undefined && downloadProgress[msgId] > 0 && downloadProgress[msgId] < 1) return;

    const xhr = new XMLHttpRequest();
    xhr.open('GET', media.url, true);
    xhr.responseType = 'blob';

    xhr.onprogress = (e) => {
      if (e.lengthComputable) {
        const p = e.loaded / e.total;
        setDownloadProgress((prev) => ({ ...prev, [msgId]: Math.min(p, 0.99) }));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const blob = xhr.response;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = media.filename || `media.${getMediaExt(media.type)}`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setDownloadProgress((prev) => ({ ...prev, [msgId]: 1 }));
        setTimeout(() => {
          setDownloadProgress((prev) => {
            const next = { ...prev };
            delete next[msgId];
            return next;
          });
        }, 1500);
      } else {
        setDownloadProgress((prev) => {
          const next = { ...prev };
          delete next[msgId];
          return next;
        });
      }
    };

    xhr.onerror = () => {
      setDownloadProgress((prev) => {
        const next = { ...prev };
        delete next[msgId];
        return next;
      });
    };

    setDownloadProgress((prev) => ({ ...prev, [msgId]: 0.01 }));
    xhr.send();
  };

  const resetTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleSend = async () => {
    const sendText = text.trim();
    if (!sendText && !previewImage && !selectedFile && !recordedAudioUrl) return;

    if (editingMessage) {
      setLocalMessages(prev => prev.map(m => m._id === editingMessage._id ? { ...m, text: sendText, isEdited: true } : m));
      setText('');
      setEditingMessage(null);
      return;
    }

    if (!conversationId || !currentUser) return;
    setSending(true);
    setText('');
    resetTextarea();

    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      _id: tempId,
      sender: { _id: currentUser._id, name: currentUser.name, username: currentUser.username, avatar: currentUser.avatar },
      text: sendText,
      createdAt: new Date().toISOString(),
      replyTo: replyTo ? { _id: replyTo._id, text: replyTo.text, sender: replyTo.sender, mediaUrl: replyTo.mediaUrl, mediaType: replyTo.mediaType } : undefined,
    };
    setLocalMessages((prev) => [...prev, optimistic]);

    try {
      const res = await fetchWithAuth(`${BASE}/api/chats/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          text: sendText,
          replyTo: replyTo ? { _id: replyTo._id, text: replyTo.text, sender: replyTo.sender, mediaUrl: replyTo.mediaUrl, mediaType: replyTo.mediaType } : undefined,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.data?.message) {
          setLocalMessages((prev) => prev.map((m) => (m._id === tempId ? json.data.message : m)));
        } else {
          setLocalMessages((prev) => prev.filter((m) => m._id !== tempId));
        }
      } else {
        setLocalMessages((prev) => prev.filter((m) => m._id !== tempId));
      }
      setText('');
      setReplyTo(null);
      setEditingMessage(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send');
      setLocalMessages((prev) => prev.filter((m) => m._id !== tempId));
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter inserts a newline; sending is via the send button only.
  };

  const toggleMessageSelection = (msgId: string) => {
    setSelectedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
        if (next.size === 0) {
          setSelectionMode(false);
        }
      } else {
        next.add(msgId);
      }
      return next;
    });
  };

  const handleLongPress = (msgId: string) => {
    if (!selectionMode) {
      setSelectionMode(true);
      setSelectedMessages(new Set([msgId]));
    }
  };

  const clearSelection = () => {
    setSelectedMessages(new Set());
    setSelectionMode(false);
  };

  const handleDeleteMessages = async () => {
    const ids = Array.from(selectedMessages);
    setDeleteModal({ open: true, messageIds: ids });
  };

  const confirmDelete = async (deleteFor: 'me' | 'everyone') => {
    const { messageIds } = deleteModal;
    setDeleteModal({ open: false, messageIds: [] });
    clearSelection();

    try {
      await Promise.all(
        messageIds.map((msgId) =>
          fetchWithAuth(`${BASE}/api/chats/${conversationId}/messages/${msgId}`, {
            method: 'DELETE',
            body: JSON.stringify({ deleteFor }),
          })
        )
      );
      mutateMessages();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (file.type.startsWith('video/')) {
      setIsVideoTrimmerOpen(true);
    } else {
      setIsCropperOpen(true);
    }
    e.target.value = '';
  };

  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversationId) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewImage(ev.target?.result as string);
    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
    } else {
      setPreviewImage('document');
    }
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
      if (replyTo) formData.append('replyTo', JSON.stringify({ _id: replyTo._id, text: replyTo.text, sender: replyTo.sender, mediaUrl: replyTo.mediaUrl, mediaType: replyTo.mediaType }));
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
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (convError) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background">
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
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background">
        <p className="text-muted-foreground">User not found</p>
        <button onClick={() => router.push('/chats')} className="text-accent text-sm mt-1 hover:underline cursor-pointer">
          Back to chats
        </button>
      </div>
    );
  }

  // Always show 24hr time only — no AM/PM, no date, regardless of how old the message is
  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const formatDateLabel = (isoDate: string) => {
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

  const groupedMessages = displayedMessages.reduce<{ date: string; messages: Message[] }[]>((acc, msg) => {
    if (!msg.createdAt) return acc;
    const d = new Date(msg.createdAt);
    if (isNaN(d.getTime())) return acc;
    const date = d.toISOString().slice(0, 10);
    const last = acc[acc.length - 1];
    if (last && last.date === date) { last.messages.push(msg); }
    else { acc.push({ date, messages: [msg] }); }
    return acc;
  }, []);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  const handleToggleBlock = async () => {
    if (!otherUser) return;
    const nextBlocked = !convData?.conversation?.isBlocked;
    try {
      const res = await fetchWithAuth(`${BASE}/api/users/${otherUser._id}/block`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('Failed');
      mutateConv();
      toast.success(nextBlocked ? `Blocked ${otherUser.name}` : `Unblocked ${otherUser.name}`);
    } catch {
      toast.error('Failed to update block status');
    }
  };

  const waveHeights = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="fixed z-[60] flex flex-col lg:flex-row bg-background overflow-hidden overscroll-none" style={{ top: 0, bottom: 0, left: 0, right: 0 }}>
      {/* Desktop messages sidebar */}
      <div className="hidden lg:flex w-[320px] h-full flex-shrink-0 border-r border-border/40 flex-col bg-background">
        <ConversationsSidebar activeConversationId={otherUserId} variant="desktop" />
      </div>

      <div className="flex-1 flex flex-col h-full min-w-0 min-h-0 bg-background relative overflow-hidden overscroll-none">
        {/* Normal header */}
        {!selectionMode ? (
        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0 bg-background/95 backdrop-blur-sm relative z-30">
          {/* Back arrow */}
          <button
            onClick={() => router.push('/chats')}
            className="p-1.5 -ml-1 rounded-full hover:bg-muted text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Link href={`/profile/${otherUser.username}`} className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative flex-shrink-0">
              {!convData?.conversation?.neverDeleteMessages ? (
                <div className="rounded-full p-[2px] bg-gradient-to-tr from-amber-400/80 to-amber-500/80">
                  <UserAvatar avatar={otherUser.avatar} name={otherUser.name} size="sm" />
                </div>
              ) : (
                <UserAvatar avatar={otherUser.avatar} name={otherUser.name} size="sm" />
              )}
              {/* Auto-delete clock indicator on the DP border */}
              {!convData?.conversation?.neverDeleteMessages && (
                <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 text-white flex items-center justify-center border border-background" title="Auto-delete: 24h">
                  <Clock className="w-2 h-2" />
                </div>
              )}
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background hidden lg:block" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate leading-tight">{otherUser.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                <p className="text-[11px] text-muted-foreground/70 truncate">@{otherUser.username}</p>
                {convData?.conversation?.isBlocked && (
                  <span className="flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-px rounded-full bg-red-500/10 text-red-500 text-[9px] font-semibold uppercase tracking-wide">
                    <X className="w-2.5 h-2.5" />
                    Blocked
                  </span>
                )}
              </div>
            </div>
          </Link>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setChatMenuOpen(!chatMenuOpen)}
              className="p-1.5 rounded-full text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-all"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {chatMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-56 bg-popover border border-border rounded-xl shadow-xl z-[70] py-1.5 animate-[fadeIn_0.15s_ease-out]"
                style={{ backgroundColor: 'var(--color-popover, #18181B)' }}
              >
                <button
                  onClick={() => { setChatMenuOpen(false); router.push(`/chats/settings?userId=${otherUser._id}`); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left"
                >
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Chat settings
                </button>
                <div className="h-px bg-border/50 mx-3 my-1" />
                <button
                  onClick={() => { setChatMenuOpen(false); handleToggleBlock(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left"
                >
                  <X className="w-4 h-4 text-red-500" />
                  <span className="text-red-500">{convData?.conversation?.isBlocked ? 'Unblock user' : 'Block user'}</span>
                </button>
                <button
                  onClick={() => { setChatMenuOpen(false); /* TODO: report user */ }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left"
                >
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Report
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Selection mode header */
        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0 bg-background/95 backdrop-blur-sm relative z-30">
          <button
            onClick={clearSelection}
            className="p-1.5 -ml-1 rounded-full hover:bg-muted text-foreground transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{selectedMessages.size} selected</p>
          </div>
          {selectedMessages.size === 1 ? (
            <button
              onClick={() => {
                const msgId = Array.from(selectedMessages)[0];
                const msg = displayedMessages.find(m => m._id === msgId);
                if (msg) setActionSheetMsg(msg);
              }}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted text-foreground transition-colors cursor-pointer"
            >
              <span className="font-bold text-lg leading-none">...</span>
            </button>
          ) : (
            <button
              onClick={handleDeleteMessages}
              disabled={selectedMessages.size === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-all disabled:opacity-40 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 px-4 py-3 scroll-smooth">
        {msgLoading && messages.length === 0 && localMessages.length === 0 ? (
          <div className="space-y-4 pt-4">
            {[70, 50, 80, 40, 65].map((w, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                {i % 2 !== 0 && <div className="w-6 h-6 rounded-full bg-muted animate-pulse flex-shrink-0" />}
                <div
                  className="h-9 rounded-2xl bg-muted animate-pulse"
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
              <div className="flex justify-center my-6">
                <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/50 uppercase select-none lg:bg-muted lg:border lg:border-border/40 lg:px-3 lg:py-1 lg:rounded-full lg:normal-case lg:tracking-normal lg:text-[11px] lg:text-muted-foreground/80">
                  {formatDateLabel(group.date)}
                </span>
              </div>

              <div className="space-y-1.5">
                {group.messages.map((msg) => {
                  const mine = isOwnMessage(msg.sender._id);
                  const isTemp = msg._id.startsWith('temp-');
                  const mediaItem: MediaItem | undefined = Array.isArray(msg.media) ? msg.media[0] : msg.media;
                  const isRealReply = !!(msg.replyTo?._id && msg.replyTo?.sender?.name);

                  return (
                    <div
                      key={msg._id}
                      id={`msg-${msg._id}`}
                      ref={(el) => { if (el) messageRefs.current[msg._id] = el; }}
                      className={`flex ${mine ? 'justify-end' : 'justify-start'} items-end gap-2 group relative ${selectedMessages.has(msg._id) ? 'opacity-80' : ''}`}
                      onMouseEnter={() => { if (!selectionMode) setHoveredMsgId(msg._id); }}
                      onMouseLeave={() => setHoveredMsgId(null)}
                      onTouchStart={(e) => {
                        touchStartXRef.current = e.touches[0].clientX;
                        longPressTimerRef.current = setTimeout(() => handleLongPress(msg._id), 500);
                      }}
                      onTouchMove={(e) => {
                        const delta = e.touches[0].clientX - touchStartXRef.current;
                        if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
                        if (delta > 50 && !isTemp && !selectionMode) {
                          setReplyTo({
                            _id: msg._id,
                            text: msg.text || '',
                            sender: { name: msg.sender.name },
                            mediaUrl: mediaItem?.url,
                            mediaType: mediaItem?.type
                          });
                          touchStartXRef.current = Infinity;
                        }
                      }}
                      onTouchEnd={() => {
                        if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
                      }}
                      onClick={(e) => {
                        if (selectionMode) {
                          e.preventDefault();
                          toggleMessageSelection(msg._id);
                        }
                      }}
                    >
                      {/* Selection checkbox — shown in selection mode */}
                      {selectionMode && (
                        <div
                          className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer self-end mb-1 ${
                            selectedMessages.has(msg._id)
                              ? 'bg-accent border-accent text-white'
                              : 'border-muted-foreground/40'
                          }`}
                          onClick={(e) => { e.stopPropagation(); toggleMessageSelection(msg._id); }}
                        >
                          {selectedMessages.has(msg._id) && (
                            <span className="text-[10px] font-bold">&#10003;</span>
                          )}
                        </div>
                      )}

                      {!mine && (
                        <Link href={`/profile/${msg.sender.username}`} className="flex-shrink-0 self-end mb-0.5">
                          <UserAvatar avatar={msg.sender.avatar} name={msg.sender.name} size="xs" />
                        </Link>
                      )}

                      {mine && hoveredMsgId === msg._id && !isTemp && !selectionMode && (
                        <button
                          onClick={() => setReplyTo({
                            _id: msg._id,
                            text: msg.text || '',
                            sender: { name: msg.sender.name },
                            mediaUrl: mediaItem?.url,
                            mediaType: mediaItem?.type
                          })}
                          className="flex-shrink-0 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-accent transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                        >
                          <CornerUpLeft className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <div
                        className={`max-w-[80%] min-w-0 w-fit relative ${
                          (mediaItem?.type === 'image' || mediaItem?.type === 'video') && !msg.text
                            ? ''
                            : mediaItem?.type === 'document'
                            ? ''
                            : 'rounded-2xl overflow-hidden ' + (mine
                                ? 'bg-accent text-white rounded-br-[4px]'
                                : 'bg-muted text-foreground rounded-bl-[4px]')
                        } ${isTemp ? 'opacity-60' : ''}`}
                      >
                        {mediaItem?.type === 'voice' && (
                          <div className="px-3 py-2">
                            <VoiceBubble url={mediaItem.url} duration={mediaItem.duration} isMine={mine} />
                          </div>
                        )}

                        {mediaItem?.type === 'image' && (
                          <div className={`${mine ? 'bg-accent/20' : 'bg-muted'} rounded-2xl overflow-hidden p-0.5 relative ${msg.text || msg.replyTo ? '' : 'shadow-sm'}`}>
                            <img
                              src={mediaItem.url}
                              alt="Image"
                              className="w-full max-h-[350px] object-cover cursor-pointer rounded-xl"
                              onClick={() => { setLightboxUrl(mediaItem.url); setLightboxOpen(true); }}
                            />
                            <div className={`absolute bottom-1.5 right-1.5 bg-black/50 px-1.5 py-0.5 rounded-md flex items-center gap-1 ${msg.text || msg.replyTo ? 'opacity-90' : ''}`}>
                              <span className="text-white/90 text-[10px] leading-none">{isTemp ? '···' : formatTime(msg.createdAt)}</span>
                              {mine && !isTemp && (
                                <CheckCheck className={`w-2.5 h-2.5 ${msg.readAt ? 'text-blue-300' : 'text-white/50'}`} />
                              )}
                            </div>
                            {!isTemp && !mine && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDownloadMedia(mediaItem, msg._id); }}
                                className="absolute top-1.5 right-1.5 bg-black/50 rounded-full p-1.5 hover:bg-black/70 transition-colors cursor-pointer"
                                disabled={downloadProgress[msg._id] > 0 && downloadProgress[msg._id] < 1}
                                title="Download"
                              >
                                {downloadProgress[msg._id] > 0 && downloadProgress[msg._id] < 1 ? (
                                  <span className="flex items-center gap-1 text-white text-[10px]">
                                    <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    {Math.round(downloadProgress[msg._id] * 100)}%
                                  </span>
                                ) : (
                                  <Download className="w-3.5 h-3.5 text-white" />
                                )}
                              </button>
                            )}
                          </div>
                        )}

                        {mediaItem?.type === 'video' && (
                          <div className="relative rounded-2xl overflow-hidden bg-black flex items-center justify-center">
                            <video
                              src={mediaItem.url}
                              className="w-full max-h-[350px] object-cover opacity-80"
                              controls
                              preload="metadata"
                            />
                            {!isTemp && !mine && (
                              <button
                                onClick={() => handleDownloadMedia(mediaItem, msg._id)}
                                className="absolute top-1.5 right-1.5 bg-black/50 rounded-full p-1.5 hover:bg-black/70 transition-colors cursor-pointer"
                                disabled={downloadProgress[msg._id] > 0 && downloadProgress[msg._id] < 1}
                                title="Download"
                              >
                                {downloadProgress[msg._id] > 0 && downloadProgress[msg._id] < 1 ? (
                                  <span className="flex items-center gap-1 text-white text-[10px]">
                                    <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    {Math.round(downloadProgress[msg._id] * 100)}%
                                  </span>
                                ) : (
                                  <Download className="w-3.5 h-3.5 text-white" />
                                )}
                              </button>
                            )}
                          </div>
                        )}

                        {mediaItem?.type === 'document' && (
                          <div className="border border-accent/40 rounded-2xl overflow-hidden w-full max-w-[280px] flex flex-col shadow-sm">
                            {/* PDF first-page preview (when available) */}
                            {isPdf(mediaItem) && (() => {
                              const pdfPreviewUrl = getPdfFirstPageUrl(mediaItem);
                              return pdfPreviewUrl ? <PdfPreview url={pdfPreviewUrl} fallback={null} /> : null;
                            })()}
                            {/* Header — ext badge + filename + size (always shown) */}
                            <div className="bg-muted px-3 py-2.5 flex items-center gap-2.5 border-b border-border/60">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${getDocExtBadge(getDocExt(mediaItem))}`}>
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">{getDocDisplayName(mediaItem)}</p>
                                <p className="text-[10px] text-muted-foreground/80 truncate">
                                  {mediaItem.size ? formatFileSize(mediaItem.size) : 'File'}
                                </p>
                              </div>
                            </div>
                            {/* Body */}
                            <div className="bg-[#1C1C1E] p-3 text-white flex flex-col gap-2">
                              {msg.text && (
                                <p className="text-xs leading-relaxed [overflow-wrap:anywhere]">
                                  {msg.text}
                                </p>
                              )}
                              <div className="flex items-center justify-between gap-2">
                                {!isTemp && !mine && (
                                  <button
                                    onClick={() => handleDownloadMedia(mediaItem, msg._id)}
                                    disabled={downloadProgress[msg._id] > 0 && downloadProgress[msg._id] < 1}
                                    className="text-[10px] font-semibold bg-white/10 hover:bg-white/20 rounded-md px-2 py-1 flex items-center gap-1 text-white transition-colors cursor-pointer"
                                    title="Download document"
                                  >
                                    {downloadProgress[msg._id] > 0 && downloadProgress[msg._id] < 1 ? (
                                      <>
                                        <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        {Math.round(downloadProgress[msg._id] * 100)}%
                                      </>
                                    ) : (
                                      <>
                                        <Download className="w-3 h-3" />
                                        Download
                                      </>
                                    )}
                                  </button>
                                )}
                                <div className="flex items-center justify-end gap-1 ml-auto">
                                  <span className="text-[10px] text-white/60">{formatTime(msg.createdAt)}</span>
                                  {mine && (
                                    <CheckCheck className={`w-3 h-3 ${msg.readAt ? 'text-blue-400' : 'text-white/40'}`} />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {(msg.text || msg.replyTo || (mediaItem?.type !== 'image' && mediaItem?.type !== 'video')) && mediaItem?.type !== 'document' && (
                          <div>
                            {isRealReply && msg.replyTo && (
                              <div
                                className="px-2.5 pt-2 pb-0.5 cursor-pointer"
                                onClick={() => handleScrollToMessage(msg.replyTo!._id)}
                              >
                                <div className={`pl-2 border-l-2 ${mine ? 'border-white/40' : 'border-accent/60'}`}>
                                  <p className={`text-[11px] font-semibold truncate ${mine ? 'text-white/80' : 'text-accent'}`}>
                                    {msg.replyTo.sender.name}
                                  </p>
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    {(msg.replyTo.mediaType === 'image' || msg.replyTo.mediaType === 'video') && msg.replyTo.mediaUrl && (
                                      <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0 bg-black/20 relative">
                                        <img src={msg.replyTo.mediaUrl} alt="" className="w-full h-full object-cover" />
                                        {msg.replyTo.mediaType === 'video' && (
                                          <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                                            <Play className="w-2.5 h-2.5 text-white" />
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {msg.replyTo.mediaType === 'voice' && (
                                      <Mic className={`w-3 h-3 flex-shrink-0 ${mine ? 'text-white/50' : 'text-muted-foreground/70'}`} />
                                    )}
                                    {msg.replyTo.mediaType === 'document' && (
                                      <FileText className={`w-3 h-3 flex-shrink-0 ${mine ? 'text-white/50' : 'text-muted-foreground/70'}`} />
                                    )}
                                    <p className={`text-[11px] truncate ${mine ? 'text-white/50' : 'text-muted-foreground/70'}`}>
                                      {msg.replyTo.text || (msg.replyTo.mediaType === 'image' ? 'Photo' : msg.replyTo.mediaType === 'video' ? 'Video' : msg.replyTo.mediaType === 'voice' ? 'Voice note' : msg.replyTo.mediaType === 'document' ? 'Document' : 'Message')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className={`relative px-3 py-1.5 ${mediaItem?.type === 'image' || mediaItem?.type === 'video' ? '' : 'min-w-[70px]'}`}>
                              {msg.text && (
                                <span className={`text-[15px] leading-snug whitespace-pre-wrap break-words [overflow-wrap:anywhere] block w-full ${mediaItem?.type === 'image' || mediaItem?.type === 'video' ? '' : 'pb-3'} ${mine ? 'text-white' : 'text-foreground'}`}>
                                  {msg.text}
                                </span>
                              )}
                              {(mediaItem?.type !== 'image' && mediaItem?.type !== 'video') && (
                                <div className="absolute bottom-1.5 right-3 flex items-center gap-1">
                                  <span className={`text-[10px] leading-none ${mine ? 'text-white/60' : 'text-muted-foreground/70'}`}>
                                    {isTemp ? '···' : formatTime(msg.createdAt)}
                                  </span>
                                    {mine && !isTemp && (
                                      <CheckCheck className={`w-3 h-3 ${msg.readAt ? 'text-blue-300' : 'text-white/40'}`} />
                                    )}
                                  </div>
                              )}
                            </div>
                          </div>
                        )}

                         {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div className={`flex flex-wrap gap-0.5 ${mine ? 'justify-end' : 'justify-start'} relative ${mediaItem?.type === 'image' || mediaItem?.type === 'video' ? '-mt-2 mr-2 ml-2 mb-1' : 'mr-2 ml-2 mb-0.5'}`}>
                            {Object.entries(
                              Object.entries(msg.reactions).reduce((acc, [, emoji]) => {
                                acc[emoji] = (acc[emoji] || 0) + 1;
                                return acc;
                              }, {} as Record<string, number>)
                            ).map(([emoji, count]) => (
                              <span
                                key={emoji}
                                className={`
                                  inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs leading-none shadow-sm border
                                  ${mine ? 'bg-gray-800/90 border-gray-700' : 'bg-card border-border'}
                                `}
                                style={{
                                  backdropFilter: 'blur(4px)',
                                  WebkitBackdropFilter: 'blur(4px)',
                                }}
                              >
                                <span className="text-sm">{emoji}</span>
                                {count > 1 && <span className="text-[10px] text-muted-foreground font-medium">{count}</span>}
                              </span>
                            ))}
                          </div>
                        )}

                      </div>
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
        <div className="flex items-center gap-3 px-4 py-2.5 bg-accent/5 flex-shrink-0">
          <div className="w-0.5 h-9 rounded-full bg-accent flex-shrink-0" />
          
          {/* Render media thumbnail if present */}
          {(replyTo.mediaType === 'image' || replyTo.mediaType === 'video') ? (
            <div className="w-9 h-9 rounded overflow-hidden flex-shrink-0 bg-black/5">
              {replyTo.mediaType === 'image' ? (
                <img src={replyTo.mediaUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-black flex items-center justify-center">
                  <Play className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ) : replyTo.mediaType === 'voice' ? (
            <div className="w-9 h-9 rounded bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Mic className="w-4 h-4 text-accent" />
            </div>
          ) : replyTo.mediaType === 'document' ? (
            <div className="w-9 h-9 rounded bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-purple-500" />
            </div>
          ) : null}

          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-accent truncate">{replyTo.sender.name}</p>
            <p className="text-[11px] text-muted-foreground/80 truncate">
              {replyTo.text || (
                replyTo.mediaType === 'image' ? 'Photo' :
                replyTo.mediaType === 'video' ? 'Video' :
                replyTo.mediaType === 'voice' ? 'Voice note' :
                replyTo.mediaType === 'document' ? 'Document' : ''
              )}
            </p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input area — flex-shrink-0 keeps it pinned above keyboard */}
      <div
        className="flex-shrink-0 bg-background px-4 py-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 12px) + 6px)' }}
      >
        <div className="flex items-end gap-2">
          {/* Attach button — hidden during recording/voice preview */}
          {!isRecording && !recordedAudioUrl && (
            <button
              onClick={() => setShowAttachMenu(true)}
              className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-all flex-shrink-0 cursor-pointer border border-border/50"
            >
              <Plus className="w-5 h-5 text-foreground" />
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
          <input ref={docInputRef} type="file" accept="*/*" className="hidden" onChange={handleDocumentSelect} />

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
              className="flex-1 bg-muted/80 text-foreground border border-border/40 placeholder:text-muted-foreground/50 rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent/30 transition-all resize-none overflow-hidden min-h-[40px]"
              style={{ resize: 'none' }}
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
                className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center hover:bg-muted/80 border border-border/50 transition-all active:scale-95 cursor-pointer flex-shrink-0"
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
                    if (recordingDuration > 0) formData.append('duration', String(recordingDuration * 1000));
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

      {/* Attachment type picker popup */}
      {showAttachMenu && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center"
          onClick={() => setShowAttachMenu(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          {/* Sheet */}
          <div
            className="relative w-full max-w-lg mx-auto rounded-t-2xl bg-card border border-border/60 shadow-2xl p-4 pb-8 md:pb-4 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-4" />
            <p className="text-center text-sm font-semibold text-foreground mb-4">Add Attachment</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Image / Video */}
              <button
                onClick={() => { setShowAttachMenu(false); fileInputRef.current?.click(); }}
                className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-muted hover:bg-accent/10 border border-border/40 transition-all active:scale-95 cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center group-hover:bg-accent/25 transition-colors">
                  <ImageIcon className="w-6 h-6 text-accent" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">Image / Video</p>
                  <p className="text-[11px] text-muted-foreground/70">Camera roll</p>
                </div>
              </button>
              {/* Document */}
              <button
                onClick={() => { setShowAttachMenu(false); docInputRef.current?.click(); }}
                className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-muted hover:bg-purple-500/10 border border-border/40 transition-all active:scale-95 cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-500/15 flex items-center justify-center group-hover:bg-purple-500/25 transition-colors">
                  <FileText className="w-6 h-6 text-purple-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">Document</p>
                  <p className="text-[11px] text-muted-foreground/70">PDF, Word, etc.</p>
                </div>
              </button>
            </div>
            <button
              onClick={() => setShowAttachMenu(false)}
              className="w-full py-2.5 rounded-xl bg-muted text-sm font-semibold text-foreground hover:bg-muted/80 transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Image preview modal */}
      {previewImage && previewImage !== 'document' && (
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

      {/* Document preview modal */}
      {previewImage === 'document' && selectedFile && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
          <div className="bg-card border border-border rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl">
            <div className="flex flex-col items-center justify-center p-8 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/15 flex items-center justify-center">
                <FileText className="w-8 h-8 text-purple-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground text-sm">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatFileSize(selectedFile.size)}</p>
              </div>
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
                  <><File className="w-4 h-4" /> Send File</>
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

      {/* Video Trimmer Modal */}
      {selectedFile && isVideoTrimmerOpen && (
        <VideoTrimmerModal
          file={selectedFile}
          isOpen={isVideoTrimmerOpen}
          onClose={() => {
            setIsVideoTrimmerOpen(false);
            setSelectedFile(null);
          }}
          onTrimComplete={(trimmedFile) => {
            setIsVideoTrimmerOpen(false);
            handleCropComplete(trimmedFile);
          }}
        />
      )}

      {/* Image Lightbox */}
      <ImageLightbox
        images={lightboxOpen ? [lightboxUrl] : []}
        initialIndex={0}
        onClose={() => setLightboxOpen(false)}
      />

      {/* Single-message action sheet */}
      {actionSheetMsg && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center" onClick={() => setActionSheetMsg(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div
            className="relative w-full max-w-sm mx-auto rounded-t-2xl bg-card border border-border/60 shadow-2xl p-5 pb-8 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-4" />
            <div className="flex gap-2 justify-around mb-4">
              {['❤️', '👍', '😂', '😮', '😢', '🙏'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    handleReactToMessage(actionSheetMsg._id, emoji);
                    setActionSheetMsg(null);
                    clearSelection();
                  }}
                  className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-muted text-xl transition-all active:scale-125 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="space-y-0.5">
              <button
                onClick={() => {
                  setReplyTo({ _id: actionSheetMsg._id, text: actionSheetMsg.text || '', sender: { name: actionSheetMsg.sender.name }, mediaUrl: actionSheetMsg.media ? (Array.isArray(actionSheetMsg.media) ? actionSheetMsg.media[0]?.url : actionSheetMsg.media?.url) : undefined, mediaType: actionSheetMsg.media ? (Array.isArray(actionSheetMsg.media) ? actionSheetMsg.media[0]?.type : actionSheetMsg.media?.type) : undefined });
                  setActionSheetMsg(null);
                  clearSelection();
                }}
                className="w-full py-2.5 px-3 rounded-xl hover:bg-muted text-sm font-medium text-foreground transition-colors flex items-center gap-3 cursor-pointer"
              >
                <Reply className="w-4 h-4 text-muted-foreground" />
                Reply
              </button>
              {isOwnMessage(actionSheetMsg.sender._id) && (
                <button
                  onClick={() => {
                    const diffMins = (Date.now() - new Date(actionSheetMsg.createdAt).getTime()) / 60000;
                    if (diffMins > 15) alert('You can only edit messages within 15 minutes of sending.');
                    else { setEditingMessage(actionSheetMsg); setText(actionSheetMsg.text || ''); setActionSheetMsg(null); clearSelection(); }
                  }}
                  className="w-full py-2.5 px-3 rounded-xl hover:bg-muted text-sm font-medium text-foreground transition-colors flex items-center gap-3 cursor-pointer"
                >
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Edit
                </button>
              )}
            </div>
            <div className="border-t border-border/40 mt-3 pt-3">
              <button
                onClick={() => {
                  setDeleteModal({ open: true, messageIds: [actionSheetMsg._id] });
                  setActionSheetMsg(null);
                }}
                className="w-full py-2.5 px-3 rounded-xl hover:bg-destructive/10 text-sm font-medium text-destructive transition-colors flex items-center gap-3 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Delete message
              </button>
            </div>
            <button
              onClick={() => { setActionSheetMsg(null); clearSelection(); }}
              className="w-full mt-2 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center" onClick={() => setDeleteModal({ open: false, messageIds: [] })}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div
            className="relative w-full max-w-sm mx-auto rounded-t-2xl bg-card border border-border/60 shadow-2xl p-5 pb-8 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-5" />
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center mb-3">
                <Trash2 className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="text-base font-bold text-foreground">Delete message{deleteModal.messageIds.length > 1 ? 's' : ''}?</h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-[260px]">
                Choose how to delete the selected message{deleteModal.messageIds.length > 1 ? 's' : ''}.
              </p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => confirmDelete('me')}
                className="w-full py-3 rounded-xl bg-muted text-foreground text-sm font-semibold hover:bg-muted/80 transition-all active:scale-[0.98] cursor-pointer flex items-center gap-3 px-4"
              >
                <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">Delete for me</p>
                  <p className="text-[11px] text-muted-foreground/70">Remove from your view only</p>
                </div>
              </button>
              {deleteModal.messageIds.every((id) => {
                const msg = displayedMessages.find((m) => m._id === id);
                return msg && isOwnMessage(msg.sender._id);
              }) && (
                <button
                  onClick={() => confirmDelete('everyone')}
                  className="w-full py-3 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold hover:bg-destructive/20 transition-all active:scale-[0.98] cursor-pointer flex items-center gap-3 px-4"
                >
                  <div className="w-8 h-8 rounded-lg bg-destructive/15 border border-destructive/20 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold">Delete for everyone</p>
                    <p className="text-[11px] text-destructive/70">Unsend — removes for both</p>
                  </div>
                </button>
              )}
            </div>
            <button
              onClick={() => setDeleteModal({ open: false, messageIds: [] })}
              className="w-full mt-3 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default function ChatConversationPage() {
  return <ChatConversation />;
}

'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageCircle, Search, X, Sparkles, Crown, MessageSquare, MoreHorizontal, Shield, Flag, Trash2, Clock, Settings, SquarePen } from 'lucide-react';
import useSWR from 'swr';
import { useAuthStore } from '../../store/authStore';
import { fetchWithAuth } from '../../lib/api';
import { socket, connectSocket } from '../../lib/socket';
import UserAvatar from '../user/UserAvatar';
import { toast } from 'sonner';

const BASE = process.env.NEXT_PUBLIC_API_URL;

const fetcher = async (url: string) => {
  const res = await fetchWithAuth(url, { method: 'GET' })
  const json = await res.json()
  if (!res.ok || !json.success) {
    throw new Error(json.message || `Request failed (${res.status})`)
  }
  return json.data
}

interface Conversation {
  _id: string;
  otherUser: { _id: string; name: string; username: string; avatar?: string; earlyAdopter?: boolean; founderBadge?: boolean };
  lastMessage: { text: string; sender: string; createdAt: string; media?: { type: string }[] } | null;
  unreadCount: number;
  updatedAt: string;
}

interface Connection {
  _id: string;
  name: string;
  username: string;
  avatar?: string;
  isFollowedByMe: boolean;
  followsMe: boolean;
}

interface ConversationsSidebarProps {
  activeConversationId?: string;
  variant?: 'desktop' | 'mobile';
}

export default function ConversationsSidebar({ activeConversationId, variant = 'desktop' }: ConversationsSidebarProps) {
  const router = useRouter();
  const { user: currentUser, accessToken } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [openMenuConvId, setOpenMenuConvId] = useState<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, mutate: mutateConversations } = useSWR<{ conversations: Conversation[] }>(
    `${BASE}/api/chats`,
    fetcher,
    { refreshInterval: 5000 }
  );

  const { data: connectionsData } = useSWR<{ users: Connection[] }>(
    `${BASE}/api/users/connections`,
    fetcher
  );

  const conversations = data?.conversations || [];
  const connections = connectionsData?.users?.filter(
    (c) => c._id !== currentUser?._id
  ) || [];

  const filteredConnections = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return connections.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.username.toLowerCase().includes(q)
    );
  }, [connections, searchQuery]);

  const showSearchResults = searchQuery.trim().length > 0;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [connections]);

  useEffect(() => {
    if (!accessToken) return;
    connectSocket(accessToken);

    const handleOnline = (userId: string) => {
      setOnlineIds((prev) => new Set(prev).add(userId));
    };
    const handleOffline = (userId: string) => {
      setOnlineIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };

    const handleMessage = () => {
      mutateConversations();
    };

    socket.on('user:online', handleOnline);
    socket.on('user:offline', handleOffline);
    socket.on('chat:message', handleMessage);

    return () => {
      socket.off('user:online', handleOnline);
      socket.off('user:offline', handleOffline);
      socket.off('chat:message', handleMessage);
    };
  }, [accessToken, mutateConversations]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuConvId(null);
      }
    };
    if (openMenuConvId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuConvId]);

  const handleBlock = async (userId: string, userName: string) => {
    setOpenMenuConvId(null);
    try {
      const res = await fetchWithAuth(`${BASE}/api/users/${userId}/block`, { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.isBlocked) {
          toast.success(`Blocked ${userName}`);
        } else {
          toast.success(`Unblocked ${userName}`);
        }
        mutateConversations();
      }
    } catch {
      toast.error('Failed to block user');
    }
  };

  const handleReport = async (userId: string) => {
    setOpenMenuConvId(null);
    const reason = prompt('Report reason: spam, harassment, hate_speech, violence, sexual_content, self_harm, impersonation, other');
    if (!reason) return;
    try {
      const res = await fetchWithAuth(`${BASE}/api/reports/user`, {
        method: 'POST',
        body: JSON.stringify({ reportedUserId: userId, reason }),
      });
      if (res.ok) {
        toast.success('User reported');
      } else {
        const json = await res.json();
        toast.error(json.message || 'Failed to report');
      }
    } catch {
      toast.error('Failed to report user');
    }
  };

  const toggleNeverDelete = async (userId: string, currentValue: boolean) => {
    setOpenMenuConvId(null);
    try {
      const res = await fetchWithAuth(`${BASE}/api/chats/settings`, {
        method: 'PUT',
        body: JSON.stringify({ neverDeleteMessages: !currentValue }),
      });
      if (res.ok) {
        toast.success(!currentValue ? 'Messages will never be deleted' : 'Messages will auto-delete after 24h');
      }
    } catch {
      toast.error('Failed to update setting');
    }
  };

  const handleDeleteConversation = async (convId: string, userName: string) => {
    setOpenMenuConvId(null);
    try {
      const res = await fetchWithAuth(`${BASE}/api/chats/${convId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success(`Deleted conversation with ${userName}`);
        mutateConversations();
        if (activeConversationId === convId) {
          router.push('/chats');
        }
      } else {
        const json = await res.json();
        toast.error(json.message || 'Failed to delete conversation');
      }
    } catch {
      toast.error('Failed to delete conversation');
    }
  };

  const formatLastMsgTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHrs < 24) return `${diffHrs}h`;
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getLastMessagePreview = useCallback((conv: Conversation) => {
    if (!conv.lastMessage) return 'Start a conversation';
    const isOwn = conv.lastMessage.sender === currentUser?._id;
    const prefix = isOwn ? 'You: ' : '';
    const hasMedia = conv.lastMessage.media && conv.lastMessage.media.length > 0;
    if (hasMedia) {
      const mediaType = conv.lastMessage.media![0].type;
      if (mediaType === 'image') return `${prefix}Sent an image`;
      if (mediaType === 'voice') return `${prefix}Sent a voice note`;
      if (mediaType === 'video') return `${prefix}Sent a video`;
      if (mediaType === 'document') return `${prefix}Sent a document`;
    }
    return `${prefix}${conv.lastMessage.text}`;
  }, [currentUser]);

  if (variant === 'desktop') {
    return (
      <div className="flex flex-col h-full bg-background border-r border-border/60 select-none">
        {/* Header matching Image 2 */}
        <div className="flex items-center justify-between px-5 pt-6 pb-4">
          <h2 className="text-xl font-bold text-foreground tracking-tight">Messages</h2>
          <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <SquarePen className="w-5 h-5" />
          </button>
        </div>

        {/* Search matching Image 2 */}
        <div className="px-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/80" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations"
              className="w-full bg-muted/80 text-foreground placeholder:text-muted-foreground/60 rounded-xl pl-9 pr-8 py-2 text-xs outline-none border border-border/50 focus:border-accent/40 focus:ring-1 focus:ring-accent/10 transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2.5">
                  <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-20 bg-muted animate-pulse rounded" />
                    <div className="h-2.5 w-32 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : showSearchResults ? (
            filteredConnections.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No people found</p>
            ) : (
              filteredConnections.map((conn) => (
                <button
                  key={conn._id}
                  onClick={() => router.push(`/chats/${conn._id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 text-left transition-all duration-200"
                >
                  <UserAvatar avatar={conn.avatar} name={conn.name} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{conn.name}</p>
                    <p className="text-[10px] text-muted-foreground">@{conn.username}</p>
                  </div>
                </button>
              ))
            )
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <MessageSquare className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs font-medium text-muted-foreground">No conversations yet</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = activeConversationId === conv.otherUser._id;
              const isOnline = onlineIds.has(conv.otherUser._id);
              return (
                <div
                  key={conv._id}
                  className={`relative group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                    isSelected
                      ? 'bg-accent/10 border border-accent/30 shadow-[0_0_12px_rgba(59,130,246,0.06)]'
                      : 'hover:bg-muted/50 border border-transparent'
                  }`}
                >
                  <Link
                    href={`/chats/${conv.otherUser._id}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div className="relative flex-shrink-0">
                      <UserAvatar
                        avatar={conv.otherUser.avatar}
                        name={conv.otherUser.name}
                        size="md"
                        className="ring-1 ring-border/40"
                      />
                      {isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background shadow-sm z-10" />
                      )}
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-accent text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5 border border-background z-10">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-xs font-bold text-foreground truncate">
                            {conv.otherUser.name}
                          </span>
                        </div>
                        {conv.lastMessage?.createdAt && (
                          <span className="text-[10px] text-muted-foreground/60 flex-shrink-0 ml-1.5 font-medium">
                            {formatLastMsgTime(conv.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] truncate mt-0.5 ${conv.unreadCount > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground/70'}`}>
                        {getLastMessagePreview(conv)}
                      </p>
                    </div>
                  </Link>

                  <button
                    onClick={(e) => { e.stopPropagation(); setOpenMenuConvId(openMenuConvId === conv._id ? null : conv._id); }}
                    className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 transition-all cursor-pointer"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>

                  {openMenuConvId === conv._id && (
                    <div
                      ref={menuRef}
                      className="absolute right-3 top-12 z-50 w-48 bg-popover border border-border rounded-xl shadow-xl p-1 animate-[fadeIn_0.12s_ease-out]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleDeleteConversation(conv._id, conv.otherUser.name.split(' ')[0])}
                        className="w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg hover:bg-red-500/10 transition-colors text-red-500 text-left"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete conversation
                      </button>
                      <button
                        onClick={() => handleBlock(conv.otherUser._id, conv.otherUser.name)}
                        className="w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg hover:bg-muted transition-colors text-foreground text-left"
                      >
                        <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                        Block
                      </button>
                      <button
                        onClick={() => handleReport(conv.otherUser._id)}
                        className="w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg hover:bg-muted transition-colors text-foreground text-left"
                      >
                        <Flag className="w-3.5 h-3.5 text-muted-foreground" />
                        Report
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* User profile footer bar matching Image 2 */}
        {currentUser && (
          <div className="p-4 border-t border-border/60 bg-background flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative">
                <UserAvatar avatar={currentUser.avatar} name={currentUser.name} size="sm" />
                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-background" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{currentUser.name}</p>
                <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Active</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/settings')}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Mobile layout matching original chats/page.tsx
  return (
    <div className="pb-20">
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-accent/5 via-accent/10 to-transparent -mx-4 px-4 pt-6 pb-8">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl" />
        <div className="relative">
          <h1 className="text-2xl font-bold text-foreground">Chats</h1>
          <p className="text-sm text-muted-foreground mt-1">Connect and message with friends</p>
        </div>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search people..."
          className="w-full bg-muted/80 text-foreground placeholder:text-muted-foreground/60 rounded-xl pl-10 pr-9 py-2.5 text-sm outline-none border border-border/40 focus:border-accent/60 focus:ring-2 focus:ring-accent/20 transition-all duration-200"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showSearchResults ? (
        <div className="space-y-1 -mx-4">
          {filteredConnections.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No people found</p>
          ) : (
            filteredConnections.map((conn, i) => (
              <button
                key={conn._id}
                onClick={() => router.push(`/chats/${conn._id}`)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left animate-[fadeIn_0.3s_ease-out]"
                style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}
              >
                <UserAvatar avatar={conn.avatar} name={conn.name} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{conn.name}</p>
                  <p className="text-xs text-muted-foreground">@{conn.username}</p>
                </div>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {conn.isFollowedByMe && conn.followsMe
                    ? 'Mutual'
                    : conn.isFollowedByMe
                    ? 'Following'
                    : 'Follower'}
                </span>
              </button>
            ))
          )}
        </div>
      ) : (
        <>
          {connections.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MessageCircle className="w-3 h-3" />
                Connections
              </p>
              <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide"
                style={{ scrollBehavior: 'smooth' }}
              >
                {connections.map((conn) => {
                  const isUserOnline = onlineIds.has(conn._id);
                  return (
                    <button
                      key={conn._id}
                      onClick={() => router.push(`/chats/${conn._id}`)}
                      className="flex flex-col items-center gap-1.5 flex-shrink-0 group transition-transform duration-200 hover:scale-105"
                    >
                      <div className="relative">
                        <UserAvatar
                          avatar={conn.avatar}
                          name={conn.name}
                          size="lg"
                          className="ring-2 ring-border group-hover:ring-accent transition-all shadow-sm group-hover:shadow-md"
                        />
                        {isUserOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background shadow-sm z-10" />
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground truncate max-w-[64px] text-center transition-colors">
                        {conn.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {connections.length > 0 && conversations.length > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-border/40" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex-shrink-0">or</span>
              <div className="flex-1 h-px bg-border/40" />
            </div>
          )}

          {isLoading ? (
            <div className="space-y-4 pt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 animate-[fadeIn_0.3s_ease-out]">
                  <div className="w-12 h-12 rounded-full bg-muted animate-pulse ring-2 ring-border/30" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-muted animate-pulse rounded-md" />
                    <div className="h-3 w-48 bg-muted animate-pulse rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 animate-[fadeIn_0.4s_ease-out]">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center shadow-inner">
                <MessageCircle className="w-7 h-7 text-accent" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-foreground">No messages yet</h2>
                <p className="text-sm text-muted-foreground/80 max-w-xs">
                  Tap a connection above to start a conversation.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" />
                Messages
              </p>
              <div className="space-y-2 -mx-4">
                {conversations.map((conv, i) => {
                  const isUserOnline = onlineIds.has(conv.otherUser._id);
                  return (
                    <div
                      key={conv._id}
                      className="relative flex items-center gap-3 px-4 py-3 mx-2 rounded-xl hover:bg-muted/50 transition-all duration-200 animate-[fadeIn_0.3s_ease-out] group select-none"
                      style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}
                      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setOpenMenuConvId(openMenuConvId === conv._id ? null : conv._id); }}
                      onTouchStart={() => { longPressTimerRef.current = setTimeout(() => setOpenMenuConvId(conv._id), 500); }}
                      onTouchEnd={() => { if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; } }}
                      onTouchMove={() => { if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; } }}
                    >
                      <Link
                        href={`/chats/${conv.otherUser._id}`}
                        className="flex items-center gap-3 flex-1 min-w-0 active:scale-[0.99] transition-all duration-200"
                      >
                        <div className="relative">
                          <UserAvatar
                            avatar={conv.otherUser.avatar}
                            name={conv.otherUser.name}
                            size="md"
                            className="ring-2 ring-border/50 shadow-sm"
                          />
                          {isUserOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background shadow-sm z-10" />
                          )}
                          {conv.unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 border-2 border-background shadow-sm z-10">
                              {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-sm font-semibold text-foreground truncate">
                                {conv.otherUser.name}
                              </span>
                              {conv.otherUser.earlyAdopter && (
                                <Sparkles className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                              )}
                              {conv.otherUser.founderBadge && (
                                <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />
                              )}
                            </div>
                            {conv.lastMessage?.createdAt && (
                              <span className="text-[11px] text-muted-foreground/70 flex-shrink-0 ml-2">
                                {new Date(conv.lastMessage.createdAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            )}
                          </div>
                          <p className={`text-sm truncate mt-0.5 ${conv.unreadCount > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground/80'}`}>
                            {getLastMessagePreview(conv)}
                          </p>
                        </div>
                      </Link>
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenuConvId(openMenuConvId === conv._id ? null : conv._id); }}
                        className="flex-shrink-0 p-1.5 rounded-full text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-all cursor-pointer"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {openMenuConvId === conv._id && (
                        <div
                          ref={menuRef}
                          className="absolute right-4 top-14 z-50 w-52 bg-card border border-border rounded-xl shadow-xl p-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleDeleteConversation(conv._id, conv.otherUser.name.split(' ')[0])}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg hover:bg-red-500/10 transition-colors text-red-500 text-left"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete conversation
                          </button>
                          <div className="h-px bg-border/50 mx-3 my-1" />
                          <button
                            onClick={() => handleBlock(conv.otherUser._id, conv.otherUser.name)}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors text-foreground text-left"
                          >
                            <Shield className="w-4 h-4 text-muted-foreground" />
                            Block {conv.otherUser.name.split(' ')[0]}
                          </button>
                          <button
                            onClick={() => handleReport(conv.otherUser._id)}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors text-foreground text-left"
                          >
                            <Flag className="w-4 h-4 text-muted-foreground" />
                            Report
                          </button>
                          <div className="h-px bg-border/40 my-1" />
                          <button
                            onClick={() => toggleNeverDelete(conv.otherUser._id, false)}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors text-foreground text-left"
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground" />
                            Never delete
                          </button>
                          <button
                            onClick={() => toggleNeverDelete(conv.otherUser._id, true)}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors text-foreground text-left"
                          >
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            24hrs delete
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

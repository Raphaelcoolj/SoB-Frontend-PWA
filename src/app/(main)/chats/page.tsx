'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageCircle, Search, X, Sparkles, Crown } from 'lucide-react';
import useSWR from 'swr';
import { useAuthStore } from '../../../store/authStore';
import { fetchWithAuth } from '../../../lib/api';
import UserAvatar from '../../../components/user/UserAvatar';

const BASE = process.env.NEXT_PUBLIC_API_URL;

const fetcher = (url: string) =>
  fetchWithAuth(url, { method: 'GET' }).then((r) => r.json()).then((d) => d.data);

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

export default function ChatsPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useSWR<{ conversations: Conversation[] }>(
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

  const getLastMessagePreview = (conv: Conversation) => {
    if (!conv.lastMessage) return 'Start a conversation';
    const isOwn = conv.lastMessage.sender === currentUser?._id;
    const prefix = isOwn ? 'You: ' : '';
    const hasMedia = conv.lastMessage.media && conv.lastMessage.media.length > 0;
    if (hasMedia) {
      const mediaType = conv.lastMessage.media![0].type;
      if (mediaType === 'image') return `${prefix}Sent an image`;
      if (mediaType === 'voice') return `${prefix}Sent a voice note`;
    }
    return `${prefix}${conv.lastMessage.text}`;
  };

  return (
    <div className="pb-20">
      <h1 className="text-xl font-bold text-foreground mb-3">Chats</h1>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search people..."
          className="w-full bg-secondary text-foreground placeholder:text-muted-foreground rounded-xl pl-10 pr-9 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/50 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
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
            filteredConnections.map((conn) => (
              <button
                key={conn._id}
                onClick={() => router.push(`/chats/${conn._id}`)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 transition-colors text-left"
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
            <div className="mb-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Connections
              </p>
              <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide"
                style={{ scrollBehavior: 'smooth' }}
              >
                {connections.map((conn) => (
                  <button
                    key={conn._id}
                    onClick={() => router.push(`/chats/${conn._id}`)}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
                  >
                    <div className="relative">
                      <UserAvatar
                        avatar={conn.avatar}
                        name={conn.name}
                        size="lg"
                        className="ring-2 ring-border group-hover:ring-accent transition-all"
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground truncate max-w-[64px] text-center transition-colors">
                      {conn.name.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-4 pt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="w-12 h-12 rounded-full bg-secondary animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-secondary animate-pulse rounded" />
                    <div className="h-3 w-48 bg-secondary animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
                <MessageCircle className="w-7 h-7 text-accent" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-foreground">No messages yet</h2>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Tap a connection above to start a conversation.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Messages
              </p>
              <div className="divide-y divide-border/50 -mx-4">
                {conversations.map((conv) => (
                  <Link
                    key={conv._id}
                    href={`/chats/${conv.otherUser._id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors active:scale-[0.99]"
                  >
                    <div className="relative">
                      <UserAvatar
                        avatar={conv.otherUser.avatar}
                        name={conv.otherUser.name}
                        size="md"
                        className="ring-2 ring-border"
                      />
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 border-2 border-background shadow-sm">
                          {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 min-w-0">
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
                        {conv.lastMessage && (
                          <span className="text-[11px] text-muted-foreground flex-shrink-0 ml-2">
                            {new Date(conv.lastMessage.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm truncate mt-0.5 ${conv.unreadCount > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                        {getLastMessagePreview(conv)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

'use client';

// Modal for sending a game invitation to a connection — pick game type,
// time control, and (optionally) a conversation to post the bubble into.

import { useState } from 'react';
import { Crown, Swords, X, Grid3X3 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { UserAvatar } from '../user/UserAvatar';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { fetchWithAuth } from '../../lib/api';
import { createInvitation } from '../../services/game';
import { TIME_CONTROL_OPTIONS, GAME_TYPE_OPTIONS, type GameType } from '../../types/game';

const TYPE_ICONS: Record<GameType, typeof Crown> = {
  chess: Crown,
  checkers: Swords,
  tic_tac_toe: Grid3X3,
};

const BASE = process.env.NEXT_PUBLIC_API_URL;

interface Connection {
  _id: string;
  name: string;
  username: string;
  avatar?: string;
}

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
  /** Pre-select a conversation context (e.g. from inside a chat). */
  conversationId?: string;
}

const fetcher = async (url: string) => {
  const res = await fetchWithAuth(url, { method: 'GET' });
  const json = await res.json();
  if (!res.ok || !json?.success) throw new Error(json?.message || 'Failed to load');
  return json.data;
};

export default function InviteModal({ open, onClose, onSent, conversationId }: InviteModalProps) {
  const user = useAuthStore((s) => s.user);
  const [gameType, setGameType] = useState<GameType>('chess');
  const [timePreset, setTimePreset] = useState('blitz_3_0');
  const isTTT = gameType === 'tic_tac_toe';
  const [selectedUser, setSelectedUser] = useState<Connection | null>(null);
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);

  // Lightweight connection list fetch on open (no SWR — ephemeral modal).
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadingErr, setLoadingErr] = useState<string | null>(null);

  const loadConnections = async () => {
    if (loaded) return;
    setLoaded(true);
    try {
      const data = await fetcher(`${BASE}/api/users/connections`);
      setConnections((data.connections || data.users || data) as Connection[]);
    } catch (e) {
      setLoadingErr(e instanceof Error ? e.message : 'Failed to load connections');
    }
  };

  if (!open) return null;

  const filtered = connections.filter(
    (c) =>
      c._id !== user?._id &&
      (!search ||
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.username?.toLowerCase().includes(search.toLowerCase()))
  );

  const send = async () => {
    if (!selectedUser) return;
    setSending(true);
    try {
      await createInvitation({
        to: selectedUser._id,
        gameType,
        timeControl: isTTT ? 'untimed' : timePreset,
        conversationId,
      });
      toast.success(`Invitation sent to ${selectedUser.name}`);
      onSent?.();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border/60 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <h2 className="text-lg font-semibold">Challenge a connection</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Game type */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Game
            </p>
            <div className="grid grid-cols-3 gap-2">
              {GAME_TYPE_OPTIONS.map((opt) => {
                const Icon = TYPE_ICONS[opt.type];
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setGameType(opt.type)}
                    className={cn(
                      'flex items-center justify-center gap-2 px-3 py-3 rounded-xl border font-medium capitalize transition-colors',
                      gameType === opt.type
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border/60 text-muted-foreground hover:border-border'
                    )}
                  >
                    <Icon className="w-4 h-4" /> {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time control — tic-tac-toe has no clock */}
          {isTTT ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Time control
              </p>
              <p className="text-sm text-muted-foreground">Tic-tac-toe is untimed — no clock.</p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Time control
              </p>
              <div className="grid grid-cols-2 gap-2">
                {TIME_CONTROL_OPTIONS.map((tc) => (
                  <button
                    key={tc.preset}
                    type="button"
                    onClick={() => setTimePreset(tc.preset)}
                    className={cn(
                      'px-3 py-2 rounded-lg border text-sm transition-colors',
                      timePreset === tc.preset
                        ? 'border-accent bg-accent/10 text-accent font-medium'
                        : 'border-border/60 text-muted-foreground hover:border-border'
                    )}
                  >
                    {tc.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Opponent */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Opponent
            </p>
            {selectedUser ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
                <UserAvatar
                  avatar={selectedUser.avatar}
                  name={selectedUser.name}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedUser.name}</p>
                  <p className="text-xs text-muted-foreground">@{selectedUser.username}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  aria-label="Clear opponent"
                  className="p-1 rounded-lg hover:bg-muted"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                {!loaded && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={loadConnections}
                    className="w-full"
                  >
                    Load connections
                  </Button>
                )}
                {loadingErr && (
                  <p className="text-xs text-destructive">{loadingErr}</p>
                )}
                {loaded && (
                  <>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name or @username"
                      className="w-full px-3 py-2 mb-2 rounded-lg bg-muted border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {filtered.length === 0 && (
                        <p className="text-sm text-muted-foreground p-2">
                          No connections found.
                        </p>
                      )}
                      {filtered.map((c) => (
                        <button
                          key={c._id}
                          type="button"
                          onClick={() => setSelectedUser(c)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60 transition-colors text-left"
                        >
                          <UserAvatar avatar={c.avatar} name={c.name} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm truncate">{c.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              @{c.username}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border/50">
          <Button
            type="button"
            onClick={send}
            disabled={!selectedUser || sending}
            className="w-full"
          >
            {sending ? 'Sending…' : 'Send invitation'}
          </Button>
        </div>
      </div>
    </div>
  );
}

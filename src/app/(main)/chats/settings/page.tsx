'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowLeft, MessageCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { fetchWithAuth } from '../../../../lib/api';
import { toast } from 'sonner';

const BASE = process.env.NEXT_PUBLIC_API_URL;

const fetcher = (url: string) =>
  fetchWithAuth(url, { method: 'GET' }).then((r) => r.json()).then((d) => d.data);

export default function ChatSettingsPage() {
  const { data, isLoading, mutate } = useSWR<{ neverDeleteMessages?: boolean; allowMessagesFrom?: 'everyone' | 'connections' | 'nobody' }>(
    `${BASE}/api/chats/settings`,
    fetcher
  );

  const [neverDelete, setNeverDelete] = useState(false);
  const [allowFrom, setAllowFrom] = useState<'everyone' | 'connections' | 'nobody'>('everyone');
  const [savingNeverDelete, setSavingNeverDelete] = useState(false);
  const [savingAllowFrom, setSavingAllowFrom] = useState(false);

  React.useEffect(() => {
    if (data) {
      if (data.neverDeleteMessages !== undefined) setNeverDelete(data.neverDeleteMessages);
      if (data.allowMessagesFrom) setAllowFrom(data.allowMessagesFrom);
    }
  }, [data]);

  const toggleNeverDelete = async () => {
    setSavingNeverDelete(true);
    const newVal = !neverDelete;
    try {
      const res = await fetchWithAuth('/api/chats/settings', {
        method: 'PUT',
        body: JSON.stringify({ neverDeleteMessages: newVal }),
      });
      if (!res.ok) throw new Error('Failed');
      setNeverDelete(newVal);
      mutate();
      toast.success(newVal ? 'Messages will never be deleted' : 'Messages will be auto-deleted');
    } catch {
      toast.error('Failed to update setting');
    } finally {
      setSavingNeverDelete(false);
    }
  };

  const changeAllowFrom = async (value: 'everyone' | 'connections' | 'nobody') => {
    setSavingAllowFrom(true);
    try {
      const res = await fetchWithAuth('/api/chats/settings', {
        method: 'PUT',
        body: JSON.stringify({ allowMessagesFrom: value }),
      });
      if (!res.ok) throw new Error('Failed');
      setAllowFrom(value);
      mutate();
      toast.success(`Messages from ${value} allowed`);
    } catch {
      toast.error('Failed to update setting');
    } finally {
      setSavingAllowFrom(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-3 pt-2">
        <Link
          href="/chats"
          className="p-2 -ml-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          aria-label="Back to chats"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Chat Settings</h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <section className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Message Preferences</p>
                <p className="text-[11px] text-muted-foreground">Control your chat experience</p>
              </div>
            </div>

            <div className="px-4 pb-4 space-y-4">
              <button
                onClick={toggleNeverDelete}
                disabled={savingNeverDelete}
                className="w-full flex items-center justify-between p-4 bg-background border border-border rounded-xl hover:border-accent/40 transition-all duration-200 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Never delete messages</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Keep all messages indefinitely</p>
                </div>
                <div className="relative flex-shrink-0">
                  {savingNeverDelete ? (
                    <div className="w-11 h-6 flex items-center justify-center">
                      <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className={`w-11 h-6 rounded-full border-2 transition-all duration-300 relative ${
                      neverDelete ? 'bg-accent border-accent' : 'bg-muted border-muted-foreground/30'
                    }`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${
                        neverDelete ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </div>
                  )}
                </div>
              </button>

              <div className="p-4 bg-background border border-border rounded-xl space-y-3">
                <p className="text-sm font-semibold text-foreground">Allow messages from</p>
                <div className="space-y-2">
                  {([
                    { value: 'everyone' as const, label: 'Everyone' },
                    { value: 'connections' as const, label: 'Connections only' },
                    { value: 'nobody' as const, label: 'Nobody' },
                  ]).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => changeAllowFrom(value)}
                      disabled={savingAllowFrom}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer disabled:opacity-60 ${
                        allowFrom === value
                          ? 'bg-accent/10 border-accent/40 text-accent font-semibold'
                          : 'bg-background border-border text-muted-foreground hover:border-accent/40'
                      }`}
                    >
                      <span className="text-sm">{label}</span>
                      {savingAllowFrom && allowFrom === value ? (
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : allowFrom === value ? (
                        <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

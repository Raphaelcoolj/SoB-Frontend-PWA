'use client';

/**
 * @file page.tsx (settings/privacy)
 * @description Privacy & Safety settings page.
 * - Toggle public/private account visibility
 * - View and manage blocked users
 * - Links to Privacy Policy & Terms
 */

import React, { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  ArrowLeft,
  ShieldCheck,
  UserX,
  Globe,
  Lock,
  Info,
  ShieldOff,
  ChevronRight,
  Users,
  Download,
} from 'lucide-react';
import { useAuthStore } from '../../../../store/authStore';
import { UserAvatar } from '../../../../components/user/UserAvatar';
import { fetchWithAuth } from '../../../../lib/api';
import { toast } from 'sonner';

const fetcher = (url: string, token: string) =>
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.json())
    .then(d => d.data);

export default function PrivacySettingsPage() {
  const { user, accessToken, setUser } = useAuthStore();
  const [toggling, setToggling] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  // Fetch blocked users
  const { data: blockedData, mutate: mutateBlocked, isLoading: loadingBlocked } = useSWR(
    accessToken
      ? [`${process.env.NEXT_PUBLIC_API_URL}/api/users/me/blocked`, accessToken]
      : null,
    ([url, token]) => fetcher(url, token)
  );
  const blockedUsers: any[] = blockedData?.blockedUsers || [];

  const handleTogglePrivacy = async () => {
    if (!accessToken || toggling) return;
    setToggling(true);
    try {
      const res = await fetchWithAuth('/api/users/me/privacy', {
        method: 'PUT',
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update privacy');
      setUser({ ...user!, isPrivate: data.data.isPrivate });
      toast.success(`Account is now ${data.data.isPrivate ? 'Private 🔒' : 'Public 🌐'}`);
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setToggling(false);
    }
  };

  const handleUnblock = async (userId: string, username: string) => {
    if (!accessToken) return;
    setUnblockingId(userId);
    try {
      const res = await fetchWithAuth(`/api/users/${userId}/block`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (res.ok) {
        await mutateBlocked();
        toast.success(`Unblocked @${username}`);
      } else {
        toast.error('Failed to unblock user');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setUnblockingId(null);
    }
  };

  const isPrivate = user?.isPrivate ?? false;

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <Link
          href="/settings"
          className="p-2 -ml-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          aria-label="Back to settings"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Privacy &amp; Safety</h1>
      </div>

      {/* ── Account Visibility Card ── */}
      <section className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Section label */}
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Account Visibility</p>
            <p className="text-[11px] text-muted-foreground">Control who can see your content</p>
          </div>
        </div>

        <div className="px-4 pb-4">
          {/* Toggle row */}
          <button
            onClick={handleTogglePrivacy}
            disabled={toggling}
            className="w-full flex items-center justify-between p-4 mt-2 bg-background border border-border rounded-xl hover:border-accent/40 transition-all duration-200 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            aria-label={isPrivate ? 'Switch to public account' : 'Switch to private account'}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                isPrivate ? 'bg-accent/10' : 'bg-emerald-500/10'
              }`}>
                {isPrivate
                  ? <Lock className="w-4 h-4 text-accent" />
                  : <Globe className="w-4 h-4 text-emerald-500" />
                }
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">
                  {isPrivate ? 'Private Account' : 'Public Account'}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[200px] leading-snug">
                  {isPrivate
                    ? 'Only your followers can see your posts'
                    : 'Anyone on SoB can see your posts'}
                </p>
              </div>
            </div>

            {/* Toggle switch */}
            <div className="relative flex-shrink-0">
              {toggling ? (
                <div className="w-11 h-6 flex items-center justify-center">
                  <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className={`w-11 h-6 rounded-full border-2 transition-all duration-300 relative ${
                  isPrivate ? 'bg-accent border-accent' : 'bg-muted border-muted-foreground/30'
                }`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${
                    isPrivate ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </div>
              )}
            </div>
          </button>

          {/* Info pill */}
          <div className={`mt-3 p-3 rounded-xl flex items-start gap-2 text-[11px] leading-snug transition-all ${
            isPrivate
              ? 'bg-accent/5 border border-accent/20 text-accent/80'
              : 'bg-emerald-500/5 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
          }`}>
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>
              {isPrivate
                ? 'Existing followers can still see your posts. New followers must send a request.'
                : 'Your profile and posts are visible to everyone, including people who don\'t follow you.'}
            </span>
          </div>
        </div>
      </section>

      {/* ── Blocked Users Card ── */}
      <section className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <UserX className="w-4 h-4 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Blocked Users</p>
            <p className="text-[11px] text-muted-foreground">
              {blockedUsers.length > 0
                ? `${blockedUsers.length} user${blockedUsers.length !== 1 ? 's' : ''} blocked`
                : 'No blocked users'}
            </p>
          </div>
          {blockedUsers.length > 0 && (
            <span className="px-2 py-0.5 bg-destructive/10 text-destructive text-[10px] font-bold rounded-full">
              {blockedUsers.length}
            </span>
          )}
        </div>

        <div className="px-4 pb-4">
          {loadingBlocked ? (
            <div className="space-y-2 mt-2">
              {[1, 2].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 bg-background border border-border rounded-xl animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-muted flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 w-24 bg-muted rounded" />
                    <div className="h-2 w-16 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : blockedUsers.length === 0 ? (
            <div className="mt-2 flex flex-col items-center justify-center py-10 border border-dashed border-border rounded-xl gap-2">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">You haven&apos;t blocked anyone</p>
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              {blockedUsers.map((u: any) => (
                <div
                  key={u._id}
                  className="flex items-center gap-3 p-3 bg-background border border-border rounded-xl"
                >
                  <UserAvatar avatar={u.avatar} name={u.name} size="sm" className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{u.name}</p>
                    <p className="text-[11px] text-muted-foreground">@{u.username}</p>
                  </div>
                  <button
                    disabled={unblockingId === u._id}
                    onClick={() => handleUnblock(u._id, u.username)}
                    className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-border bg-muted text-foreground hover:border-emerald-500/50 hover:text-emerald-600 hover:bg-emerald-500/5 transition-all disabled:opacity-50 cursor-pointer"
                    aria-label={`Unblock @${u.username}`}
                  >
                    {unblockingId === u._id ? (
                      <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ShieldOff className="w-3 h-3" />
                    )}
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Data & Privacy Info ── */}
      <section className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <Info className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Data &amp; Privacy</p>
            <p className="text-[11px] text-muted-foreground">How we handle your information</p>
          </div>
        </div>

        <div className="pb-2">
          {[
            { href: '/privacy-policy', label: 'Privacy Policy' },
            { href: '/terms-of-service', label: 'Terms of Service' },
            { href: '/community-guidelines', label: 'Community Guidelines' },
            { href: '/child-safety', label: 'Child Safety' },
            { href: '/contact', label: 'Contact & Feedback' },
            { href: '/delete-account', label: 'Delete Account (Web)' },
          ].map(({ href, label }, i, arr) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors ${
                i < arr.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <span className="text-sm text-foreground">{label}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </section>

      {/* ── Download My Data ── */}
      <section className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <Download className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Download Your Data</p>
            <p className="text-[11px] text-muted-foreground">GDPR data portability — export all your data</p>
          </div>
        </div>
        <div className="px-4 pb-4">
          <DataExportButton />
        </div>
      </section>
    </div>
  );
}

function DataExportButton() {
  const [exporting, setExporting] = useState(false);
  const { accessToken } = useAuthStore();

  const handleExport = async () => {
    if (!accessToken) return;
    setExporting(true);
    try {
      const res = await fetchWithAuth('/api/users/me/export-data', { method: 'GET' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Export failed');
      const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sob-data-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Your data has been downloaded.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to export data.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 text-sm font-semibold hover:bg-emerald-500/10 transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98]"
    >
      <Download className="w-4 h-4" />
      {exporting ? 'Preparing your data...' : 'Download My Data'}
    </button>
  );
}

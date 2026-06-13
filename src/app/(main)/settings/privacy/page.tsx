'use client';

/**
 * @file page.tsx (settings/privacy)
 * @description Privacy settings. Allows toggling account visibility (public/private)
 * and managing blocked users.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowLeft, ShieldCheck, UserX, Globe, Lock, Info, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../../../store/authStore';
import { Button } from '../../../../components/ui/Button';
import { UserAvatar } from '../../../../components/user/UserAvatar';
import { fetchWithAuth } from '../../../../lib/api';

const fetcher = (url: string, token: string) => 
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.json())
    .then(d => d.data);

export default function PrivacySettingsPage() {
  const { user, accessToken, setUser } = useAuthStore();
  const [toggling, setToggling] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Fetch blocked users
  const { data: blockedData, mutate: mutateBlocked } = useSWR(
    accessToken ? [`${process.env.NEXT_PUBLIC_API_URL}/api/users/me/blocked`, accessToken] : null,
    ([url, token]) => fetcher(url, token)
  );
  const blockedUsers = blockedData?.blockedUsers || [];

  const handleTogglePrivacy = async () => {
    if (!accessToken) return;
    setToggling(true);
    try {
      const res = await fetchWithAuth('/api/users/me/privacy', { 
        method: 'PUT', 
        body: JSON.stringify({}) 
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update privacy');
      
      setUser({ ...user!, isPrivate: data.data.isPrivate });
      setStatus(`Your account is now ${data.data.isPrivate ? 'Private' : 'Public'}`);
      setTimeout(() => setStatus(null), 3000);
    } catch (err: any) {
      setStatus(err.message);
    } finally {
      setToggling(false);
    }
  };

  const handleUnblock = async (userId: string) => {
    if (!accessToken) return;
    try {
      const res = await fetchWithAuth(`/api/users/${userId}/block`, { 
        method: 'POST', 
        body: JSON.stringify({}) 
      });
      if (res.ok) {
        mutateBlocked(); // Refresh list
      }
    } catch (err) {
      console.error('Failed to unblock user:', err);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3 pt-2">
        <Link href="/settings" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Privacy</h1>
      </div>

      <section className="bg-card border border-border rounded-xl p-5 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="font-medium text-foreground">Account Visibility</p>
            <p className="text-xs text-muted-foreground">Control who can see your activity.</p>
          </div>
        </div>

        {status && (
          <div className="text-xs p-3 rounded-lg border bg-accent/10 text-accent border-accent/20 animate-in fade-in duration-300">
            {status}
          </div>
        )}

        <div className="flex items-center justify-between p-4 bg-background border border-border rounded-xl">
          <div className="flex items-center gap-3">
            {user?.isPrivate ? <Lock className="w-5 h-5 text-accent" /> : <Globe className="w-5 h-5 text-emerald-500" />}
            <div>
              <p className="text-sm font-medium text-foreground">{user?.isPrivate ? 'Private Account' : 'Public Account'}</p>
              <p className="text-[10px] text-muted-foreground">
                {user?.isPrivate 
                  ? 'Only followers can see your posts and activity.' 
                  : 'Anyone on SoB can see your posts and profile.'}
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={user?.isPrivate || false} 
              onChange={handleTogglePrivacy}
              disabled={toggling}
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
          </label>
        </div>

        {/* Blocked Users Section */}
        <div className="pt-6 border-t border-border space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <UserX className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="font-medium text-foreground">Blocked Users</p>
              <p className="text-xs text-muted-foreground">Users you've blocked cannot interact with you.</p>
            </div>
          </div>

          <div className="space-y-2">
            {blockedUsers.length === 0 ? (
              <div className="text-center py-8 bg-background border border-dashed border-border rounded-xl">
                <p className="text-xs text-muted-foreground">No blocked users.</p>
              </div>
            ) : (
              blockedUsers.map((u: any) => (
                <div key={u._id} className="flex items-center justify-between p-3 bg-background border border-border rounded-xl">
                  <div className="flex items-center gap-3">
                    <UserAvatar avatar={u.avatar} name={u.name} size="sm" />
                    <div>
                      <p className="text-xs font-medium text-foreground">{u.name}</p>
                      <p className="text-[10px] text-muted-foreground">@{u.username}</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-[10px] border-destructive text-destructive hover:bg-destructive hover:text-white"
                    onClick={() => handleUnblock(u._id)}
                  >
                    Unblock
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Data & Privacy Info */}
        <div className="pt-6 border-t border-border space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Info className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="font-medium text-foreground">Data & Privacy</p>
              <p className="text-xs text-muted-foreground">How we handle your information.</p>
            </div>
          </div>
          
          <div className="p-4 bg-background border border-border rounded-xl space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              We use your data to personalize your feed and improve your learning experience. 
              Your information is never sold to third parties.
            </p>
            <div className="flex flex-col gap-2">
              <Link href="/privacy-policy" className="text-xs text-accent hover:underline flex items-center gap-1">
                Read Privacy Policy <ArrowLeft className="w-3 h-3 rotate-180" />
              </Link>
              <Link href="/terms-of-service" className="text-xs text-accent hover:underline flex items-center gap-1">
                Terms of Service <ArrowLeft className="w-3 h-3 rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

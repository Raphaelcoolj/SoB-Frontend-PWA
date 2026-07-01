'use client';

/**
 * @file page.tsx (admin/users)
 * @description Admin user management. Paginated table of users with 
 * role management (promote/demote) and account deletion.
 */

import React, { useState } from 'react';
import useSWR from 'swr';
import { 
  Users, 
  Trash2, 
  ShieldAlert, 
  ShieldCheck, 
  Search,
  ChevronLeft,
  ChevronRight,
  Ban,
  Timer,
  Undo2,
  AlertTriangle
} from 'lucide-react';
import { useAuthStore } from '../../../../store/authStore';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { Card } from '../../../../components/ui/Card';
import { UserAvatar } from '../../../../components/user/UserAvatar';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Switch } from '../../../../components/ui/Switch';
import { fetchWithAuth } from '../../../../lib/api';
import { toast } from 'sonner';

const fetcher = (url: string) => 
  fetchWithAuth(url).then(r => r.json());

export default function AdminUsersPage() {
  const { accessToken, user: currentUser } = useAuthStore();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data, mutate, isLoading } = useSWR(
    accessToken ? `/api/admin/users` : null,
    fetcher
  );

  const users = data?.data?.users || [];
  const pagination = data?.meta || { page: 1, total: users.length, limit: users.length };

  const handleToggleFounderBadge = async (userId: string, current: boolean) => {
    setActionLoading(userId);
    try {
      const res = await fetchWithAuth(`/api/admin/users/${userId}/founder-badge`, {
        method: 'PUT',
        body: JSON.stringify({ founderBadge: !current }),
      });
      if (res.ok) mutate();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleToggle = async (userId: string, currentRole: string) => {
    setActionLoading(userId);
    try {
      const newRole = currentRole === 'admin' ? 'user' : 'admin';
      const res = await fetchWithAuth(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) mutate();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
    setActionLoading(userId);
    try {
      const res = await fetchWithAuth(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (res.ok) mutate();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Ban / Suspend State ──
  const [banModal, setBanModal] = useState<{ user: any } | null>(null);
  const [suspendModal, setSuspendModal] = useState<{ user: any } | null>(null);
  const [banReason, setBanReason] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendDays, setSuspendDays] = useState(7);

  const handleBanUser = async () => {
    if (!banModal) return;
    setActionLoading(banModal.user._id);
    try {
      const res = await fetchWithAuth(`/api/admin/users/${banModal.user._id}/ban`, {
        method: 'PUT',
        body: JSON.stringify({ reason: banReason }),
      });
      const data = await res.json();
      if (res.ok) { toast.success(data.message); mutate(); setBanModal(null); setBanReason(''); }
      else toast.error(data.message || 'Failed to ban user');
    } catch { toast.error('Failed to ban user'); }
    finally { setActionLoading(null); }
  };

  const handleUnbanUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      const res = await fetchWithAuth(`/api/admin/users/${userId}/unban`, { method: 'PUT' });
      const data = await res.json();
      if (res.ok) { toast.success(data.message); mutate(); }
      else toast.error(data.message || 'Failed to unban user');
    } catch { toast.error('Failed to unban user'); }
    finally { setActionLoading(null); }
  };

  const handleSuspendUser = async () => {
    if (!suspendModal) return;
    setActionLoading(suspendModal.user._id);
    try {
      const res = await fetchWithAuth(`/api/admin/users/${suspendModal.user._id}/suspend`, {
        method: 'PUT',
        body: JSON.stringify({ days: suspendDays, reason: suspendReason }),
      });
      const data = await res.json();
      if (res.ok) { toast.success(data.message); mutate(); setSuspendModal(null); setSuspendReason(''); setSuspendDays(7); }
      else toast.error(data.message || 'Failed to suspend user');
    } catch { toast.error('Failed to suspend user'); }
    finally { setActionLoading(null); }
  };

  const handleUnsuspendUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      const res = await fetchWithAuth(`/api/admin/users/${userId}/unsuspend`, { method: 'PUT' });
      const data = await res.json();
      if (res.ok) { toast.success(data.message); mutate(); }
      else toast.error(data.message || 'Failed to unsuspend user');
    } catch { toast.error('Failed to unsuspend user'); }
    finally { setActionLoading(null); }
  };

  const filteredUsers = users.filter((u: any) => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground flex items-center gap-3">
            <Users className="w-8 h-8 text-accent" />
            Users
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage all platform members and permissions.</p>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search users..." 
            className="pl-10 h-10 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">User</th>
                <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Role</th>
                <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Founder</th>
                <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Joined</th>
                <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-10 w-40" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-16" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-24" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground text-sm">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u: any) => (
                  <tr key={u._id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar avatar={u.avatar} name={u.name} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">@{u.username} · {u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded-full ${
                        u.role === 'admin' ? 'bg-accent/10 text-accent border border-accent/20' : 'bg-muted text-muted-foreground border border-border'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.isBanned ? (
                        <span className="text-[10px] font-semibold uppercase tracking-widest bg-destructive/10 text-destructive border border-destructive/20 px-2 py-1 rounded-full">
                          Banned
                        </span>
                      ) : u.suspendedUntil && new Date(u.suspendedUntil) > new Date() ? (
                        <span className="text-[10px] font-semibold uppercase tracking-widest bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-1 rounded-full">
                          Suspended
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-full">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Switch
                        checked={u.founderBadge}
                        onCheckedChange={() => handleToggleFounderBadge(u._id, u.founderBadge)}
                        disabled={actionLoading === u._id}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {u._id !== currentUser?._id && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className={`h-8 px-2 rounded-lg text-[10px] font-semibold ${u.role === 'admin' ? 'border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white' : 'border-accent text-accent hover:bg-accent hover:text-white'}`}
                              onClick={() => handleRoleToggle(u._id, u.role)}
                              loading={actionLoading === u._id}
                              title={u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                            >
                              {u.role === 'admin' ? <ShieldAlert className="w-3.5 h-3.5 mr-1" /> : <ShieldCheck className="w-3.5 h-3.5 mr-1" />}
                              {u.role === 'admin' ? 'Demote' : 'Admin'}
                            </Button>

                            {u.isBanned ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2 rounded-lg border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white text-[10px] font-semibold"
                                onClick={() => handleUnbanUser(u._id)}
                                loading={actionLoading === u._id}
                                title="Unban User"
                              >
                                <Undo2 className="w-3.5 h-3.5 mr-1" />
                                Unban
                              </Button>
                            ) : u.suspendedUntil && new Date(u.suspendedUntil) > new Date() ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 rounded-lg border-purple-500 text-purple-600 hover:bg-purple-500 hover:text-white text-[10px] font-semibold"
                                  onClick={() => handleUnsuspendUser(u._id)}
                                  loading={actionLoading === u._id}
                                  title="Unsuspend User"
                                >
                                  <Undo2 className="w-3.5 h-3.5 mr-1" />
                                  Lift
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 rounded-lg border-destructive text-destructive hover:bg-destructive hover:text-white text-[10px] font-semibold"
                                  onClick={() => { setBanModal({ user: u }); setBanReason(''); }}
                                  title="Ban User"
                                >
                                  <Ban className="w-3.5 h-3.5 mr-1" />
                                  Ban
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 rounded-lg border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white text-[10px] font-semibold"
                                  onClick={() => { setSuspendModal({ user: u }); setSuspendReason(''); setSuspendDays(7); }}
                                  title="Suspend User"
                                >
                                  <Timer className="w-3.5 h-3.5 mr-1" />
                                  Suspend
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 rounded-lg border-destructive text-destructive hover:bg-destructive hover:text-white text-[10px] font-semibold"
                                  onClick={() => { setBanModal({ user: u }); setBanReason(''); }}
                                  title="Ban User"
                                >
                                  <Ban className="w-3.5 h-3.5 mr-1" />
                                  Ban
                                </Button>
                              </>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-lg border-destructive/50 text-destructive hover:bg-destructive hover:text-white transition-all"
                              onClick={() => handleDeleteUser(u._id)}
                              loading={actionLoading === u._id}
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                        {u._id === currentUser?._id && (
                          <span className="text-[10px] font-medium text-muted-foreground italic">You</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 bg-muted/30 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {Math.min(filteredUsers.length, pagination.limit)} of {pagination.total} users
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-lg"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Prev
            </Button>
            <div className="text-xs font-medium px-3">
              Page {page} of {Math.ceil(pagination.total / pagination.limit) || 1}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-lg"
              disabled={page >= Math.ceil(pagination.total / pagination.limit)}
              onClick={() => setPage(page + 1)}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Ban Modal ── */}
      {banModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setBanModal(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Ban className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Ban @{banModal.user.username}</h3>
                <p className="text-xs text-muted-foreground">This action permanently bans the user.</p>
              </div>
            </div>
            <textarea
              placeholder="Reason for ban (shown to user)..."
              value={banReason}
              onChange={e => setBanReason(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-destructive/30"
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setBanModal(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={handleBanUser} loading={actionLoading === banModal.user._id}>
                <Ban className="w-4 h-4 mr-1.5" />
                Ban Permanently
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Suspend Modal ── */}
      {suspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSuspendModal(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Timer className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Suspend @{suspendModal.user.username}</h3>
                <p className="text-xs text-muted-foreground">Temporarily restrict the user's access.</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Duration (days)</label>
              <div className="flex gap-2">
                {[1, 3, 7, 14, 30].map(d => (
                  <button
                    key={d}
                    onClick={() => setSuspendDays(d)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      suspendDays === d
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'border-border text-muted-foreground hover:border-amber-500/30'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            <textarea
              placeholder="Reason for suspension (shown to user)..."
              value={suspendReason}
              onChange={e => setSuspendReason(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setSuspendModal(null)}>Cancel</Button>
              <Button variant="default" className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={handleSuspendUser} loading={actionLoading === suspendModal.user._id}>
                <Timer className="w-4 h-4 mr-1.5" />
                Suspend {suspendDays}d
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


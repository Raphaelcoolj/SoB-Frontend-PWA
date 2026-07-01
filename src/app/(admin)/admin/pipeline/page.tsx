'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { 
  Newspaper, Settings, Play, Pause, Calendar,
  CheckCircle2, Clock, AlertCircle, RefreshCw, FileText,
  Pencil, X
} from 'lucide-react';
import { useAuthStore } from '../../../../store/authStore';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { Card } from '../../../../components/ui/Card';
import { toast } from 'sonner';

const BASE = process.env.NEXT_PUBLIC_API_URL;

const fetcher = (url: string, token: string) =>
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.json())
    .then(d => d.data);

export default function AdminPipelinePage() {
  const { accessToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'posts'>('overview');
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: '', username: '', email: '', fieldSlug: '',
    contentType: 'article', profileBio: '', avatar: '',
  });
  const [saving, setSaving] = useState(false);

  const { data: accountsData, isLoading: accountsLoading, mutate: mutateAccounts } = useSWR(
    accessToken ? [`${BASE}/api/admin/pipeline/accounts`, accessToken] : null,
    ([url, token]) => fetcher(url, token)
  );

  const { data: campaignsData, isLoading: campaignsLoading } = useSWR(
    accessToken ? [`${BASE}/api/admin/pipeline/campaigns`, accessToken] : null,
    ([url, token]) => fetcher(url, token)
  );

  const { data: postsData, isLoading: postsLoading, mutate: mutatePosts } = useSWR(
    accessToken ? [`${BASE}/api/admin/pipeline/posts`, accessToken] : null,
    ([url, token]) => fetcher(url, token)
  );

  const accounts = accountsData?.accounts || [];
  const campaigns = campaignsData?.campaigns || [];
  const posts = postsData?.posts || [];

  const totalPublished = posts.filter((p: any) => p.isPublished).length;
  const totalPending = posts.filter((p: any) => !p.isPublished).length;
  const activeAccounts = accounts.filter((a: any) => a.isActive).length;
  const totalPosts = posts.length;

  const openEdit = (acc: any) => {
    setEditingAccount(acc);
    setEditForm({
      name: acc.name || '',
      username: acc.username || '',
      email: acc.user?.email || '',
      fieldSlug: acc.fieldSlug || '',
      contentType: acc.contentType || 'article',
      profileBio: acc.profileBio || '',
      avatar: acc.user?.avatar || '',
    });
  };

  const handleSaveAccount = async () => {
    if (!editingAccount) return;
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/admin/pipeline/accounts/${editingAccount._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Account updated.');
        setEditingAccount(null);
        mutateAccounts();
      } else {
        toast.error(data.message || 'Failed to update account');
      }
    } catch {
      toast.error('Failed to update account');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAccount = async (id: string) => {
    try {
      const res = await fetch(`${BASE}/api/admin/pipeline/accounts/${id}/toggle`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        mutateAccounts();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('Failed to toggle account');
    }
  };

  const TabButton = ({ tab, label, icon: Icon }: { tab: typeof activeTab; label: string; icon: React.ElementType }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
        activeTab === tab
          ? 'bg-accent text-white shadow-lg shadow-accent/25'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  const isLoading = accountsLoading || campaignsLoading || postsLoading;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Content Pipeline</h1>
          <p className="text-muted-foreground mt-1">AI-powered editorial publishing system.</p>
        </div>
        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl border border-border/60">
          <TabButton tab="overview" label="Overview" icon={Newspaper} />
          <TabButton tab="accounts" label="Accounts" icon={Settings} />
          <TabButton tab="posts" label="Posts" icon={FileText} />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Settings} label="Active Accounts" value={activeAccounts} total={accounts.length} color="text-accent" bg="bg-accent/10" />
            <StatCard icon={FileText} label="Total Generated" value={totalPosts} color="text-blue-500" bg="bg-blue-500/10" />
            <StatCard icon={CheckCircle2} label="Published" value={totalPublished} color="text-emerald-500" bg="bg-emerald-500/10" />
            <StatCard icon={Clock} label="Pending" value={totalPending} color="text-orange-500" bg="bg-orange-500/10" />
          </div>

          {activeTab === 'overview' && (
            <Card className="p-4 sm:p-6 border-border/60">
              <h3 className="font-medium text-sm mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-accent" />
                Recent Campaigns
              </h3>
              {campaigns.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No campaigns yet. Run <code className="bg-muted px-1.5 py-0.5 rounded text-xs">npm run generate-pipeline</code> to start.</p>
              ) : (
                <div className="space-y-3">
                  {campaigns.slice(0, 5).map((c: any) => (
                    <div key={c._id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-accent" />
                        <div>
                          <p className="text-xs font-mono text-foreground">{c._id.slice(0, 8)}...</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(c.minScheduledAt).toLocaleDateString()} — {new Date(c.maxScheduledAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground">{c.count} posts</span>
                        <span className={`text-xs font-semibold ${c.publishedCount === c.count ? 'text-emerald-500' : 'text-orange-500'}`}>
                          {c.publishedCount}/{c.count} published
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {activeTab === 'accounts' && (
            <Card className="p-4 sm:p-6 border-border/60">
              <h3 className="font-medium text-sm mb-4">Editorial Accounts</h3>
              <div className="space-y-3">
                {accounts.map((acc: any) => (
                  <div key={acc._id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40 group hover:border-accent/40 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${acc.isActive ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{acc.name}</p>
                        <p className="text-xs text-muted-foreground">@{acc.username} · {acc.contentType}s in {acc.fieldSlug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {acc.postsGenerated} gen · {acc.postsPublished} pub
                      </span>
                      <button
                        onClick={() => openEdit(acc)}
                        className="p-2 rounded-lg transition-all text-muted-foreground hover:text-accent hover:bg-accent/10"
                        title="Edit account"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleAccount(acc._id)}
                        className={`p-2 rounded-lg transition-all ${
                          acc.isActive
                            ? 'text-orange-500 hover:bg-orange-500/10'
                            : 'text-emerald-500 hover:bg-emerald-500/10'
                        }`}
                        title={acc.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {acc.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {accounts.length === 0 && (
                <p className="text-sm text-muted-foreground py-8 text-center">No editorial accounts. Run <code className="bg-muted px-1.5 py-0.5 rounded text-xs">npm run create-editorial-accounts</code> first.</p>
              )}
            </Card>
          )}

          {activeTab === 'posts' && (
            <Card className="p-4 sm:p-6 border-border/60">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-sm">Scheduled Posts</h3>
                <button onClick={() => mutatePosts()} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                {posts.map((post: any) => (
                  <div key={post._id} className="flex items-start justify-between p-3 rounded-xl bg-muted/30 border border-border/40 group hover:border-accent/40 transition-all gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                          post.contentType === 'article' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'
                        }`}>
                          {post.contentType}
                        </span>
                        {post.isPublished ? (
                          <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Published
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-orange-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground mt-1 truncate">{post.title || '(untitled)'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        @{post.editorialAccount?.username || 'unknown'} · {post.field?.name || 'unknown field'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {new Date(post.scheduledAt).toLocaleDateString()} {new Date(post.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {post.metadata?.wordCount && (
                        <p className="text-[10px] text-muted-foreground">{post.metadata.wordCount} words</p>
                      )}
                    </div>
                  </div>
                ))}
                {posts.length === 0 && (
                  <p className="text-sm text-muted-foreground py-8 text-center">No scheduled posts yet.</p>
                )}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Edit Account Modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background border border-border/60 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border/60">
              <h2 className="text-lg font-semibold">Edit Account</h2>
              <button onClick={() => setEditingAccount(null)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-start sm:items-center gap-3 mb-2">
                {editForm.avatar ? (
                  <img src={editForm.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground">
                    {(editForm.name || '?')[0]}
                  </div>
                )}
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground">Avatar URL</label>
                  <input
                    type="text"
                    value={editForm.avatar}
                    onChange={e => setEditForm(f => ({ ...f, avatar: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-muted/50 border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-muted/50 border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Username</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-muted/50 border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-muted/50 border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Field Slug</label>
                  <input
                    type="text"
                    value={editForm.fieldSlug}
                    onChange={e => setEditForm(f => ({ ...f, fieldSlug: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-muted/50 border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Content Type</label>
                  <select
                    value={editForm.contentType}
                    onChange={e => setEditForm(f => ({ ...f, contentType: e.target.value }))}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl bg-muted/50 border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                  >
                    <option value="article">Article</option>
                    <option value="post">Post</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Bio</label>
                <textarea
                  value={editForm.profileBio}
                  onChange={e => setEditForm(f => ({ ...f, profileBio: e.target.value }))}
                  rows={3}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-muted/50 border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-border/60">
              <button
                onClick={() => setEditingAccount(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAccount}
                disabled={saving}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-accent text-white hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, total, color, bg }: { icon: React.ElementType; label: string; value: number; total?: number; color: string; bg: string }) {
  return (
    <Card className="p-6 border-border/60 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={`p-2.5 rounded-xl ${bg}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-semibold text-foreground">
          {value}{total !== undefined ? <span className="text-sm text-muted-foreground">/{total}</span> : ''}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
      </div>
    </Card>
  );
}

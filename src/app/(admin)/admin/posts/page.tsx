'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { 
  FileText, 
  Trash2, 
  ExternalLink,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Shield,
  ShieldAlert,
  Flag,
  Pencil
} from 'lucide-react';
import { useAuthStore } from '../../../../store/authStore';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { fetchWithAuth } from '../../../../lib/api';

const fetcher = (url: string) => 
  fetchWithAuth(url).then(r => r.json());

export default function AdminPostsPage() {
  const { accessToken } = useAuthStore();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);

  const { data, mutate, isLoading } = useSWR(
    accessToken ? `/api/admin/posts${showFlaggedOnly ? '?flagged=true' : ''}` : null,
    fetcher
  );

  const posts = data?.data?.posts || [];
  const pagination = data?.meta || { page: 1, total: posts.length, limit: posts.length };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) return;
    setActionLoading(postId);
    try {
      const res = await fetchWithAuth(`/api/admin/posts/${postId}`, { method: 'DELETE' });
      if (res.ok) mutate();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleSensitivity = async (postId: string, currentStatus: boolean) => {
    setActionLoading(postId);
    try {
      const res = await fetchWithAuth(`/api/admin/posts/${postId}/sensitivity`, {
        method: 'PUT',
        body: JSON.stringify({ isSensitive: !currentStatus })
      });
      if (res.ok) mutate();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredPosts = posts.filter((p: any) => 
    (p.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.author.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground flex items-center gap-3">
            <FileText className="w-8 h-8 text-purple-500" />
            Content
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Monitor and moderate all platform content.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFlaggedOnly(!showFlaggedOnly)}
            className={`flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-semibold transition-all border ${
              showFlaggedOnly
                ? 'bg-red-500/10 border-red-500/30 text-red-600'
                : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <Flag className="w-4 h-4" />
            Flagged
          </button>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search content..." 
              className="pl-10 h-10 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-4 sm:px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Content</th>
                <th className="px-4 sm:px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hidden sm:table-cell">Author</th>
                <th className="px-4 sm:px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hidden md:table-cell">Field</th>
                <th className="px-4 sm:px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hidden md:table-cell">Status</th>
                <th className="px-4 sm:px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i}>
                    <td className="px-4 sm:px-6 py-4"><Skeleton className="h-12 w-40 sm:w-64" /></td>
                    <td className="px-4 sm:px-6 py-4"><Skeleton className="h-6 w-24" /></td>
                    <td className="px-4 sm:px-6 py-4"><Skeleton className="h-6 w-20" /></td>
                    <td className="px-4 sm:px-6 py-4"><Skeleton className="h-6 w-24" /></td>
                    <td className="px-4 sm:px-6 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 sm:px-6 py-12 text-center text-muted-foreground text-sm">
                    No content found.
                  </td>
                </tr>
              ) : (
                filteredPosts.map((p: any) => (
                  <tr key={p._id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-4 sm:px-6 py-4 max-w-[200px] sm:max-w-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{p.title || p.body.slice(0, 30)}</p>
                          <span className="sm:hidden text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">@{p.author.username}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{p.body}</p>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                      <p className="text-xs font-medium text-foreground truncate">@{p.author.username}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{p.author.email}</p>
                    </td>
                    <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded-lg">
                        {p.field?.name || 'General'}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                      <div className="flex flex-col gap-1">
                        {p.isSensitive ? (
                          <span className="flex items-center gap-1 text-red-500 text-[10px] font-bold uppercase tracking-wider">
                            <ShieldAlert className="w-3 h-3" />
                            Sensitive
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                            <Shield className="w-3 h-3" />
                            Safe
                          </span>
                        )}
                        {p.isAutoFlagged && (
                          <span className="flex items-center gap-1 text-amber-500 text-[10px] font-medium">
                            <Flag className="w-3 h-3" />
                            Auto-flagged
                          </span>
                        )}
                        {p.reportCount > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {p.reportCount} report{p.reportCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 sm:gap-2">
                        <button
                          onClick={() => handleToggleSensitivity(p._id, p.isSensitive)}
                          disabled={actionLoading === p._id}
                          className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-all ${
                            p.isSensitive ? 'border-red-500/20 bg-red-500/10 text-red-600' : 'border-border text-muted-foreground hover:bg-muted'
                          }`}
                          title={p.isSensitive ? "Mark as Safe" : "Mark as Sensitive"}
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <a 
                          href={`/post/${p._id}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-accent hover:border-accent transition-all"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <a 
                          href={`/post/${p._id}/edit`}
                          className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-accent hover:border-accent transition-all"
                        >
                          <Pencil className="w-4 h-4" />
                        </a>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-lg border-destructive text-destructive hover:bg-destructive hover:text-white transition-all"
                          onClick={() => handleDeletePost(p._id)}
                          loading={actionLoading === p._id}
                          title="Delete Post"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 sm:px-6 py-4 bg-muted/30 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Showing {Math.min(filteredPosts.length, pagination.limit)} of {pagination.total} posts
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-lg text-xs"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Prev
            </Button>
            <div className="text-xs font-medium px-2 sm:px-3">
              {page} / {Math.ceil(pagination.total / pagination.limit) || 1}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-lg text-xs"
              disabled={page >= Math.ceil(pagination.total / pagination.limit)}
              onClick={() => setPage(page + 1)}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}


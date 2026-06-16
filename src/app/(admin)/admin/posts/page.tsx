'use client';

/**
 * @file page.tsx (admin/posts)
 * @description Admin content management. Paginated list of all posts and articles
 * with deletion capabilities.
 */

import React, { useState } from 'react';
import useSWR from 'swr';
import { 
  FileText, 
  Trash2, 
  ExternalLink,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter
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

  const { data, mutate, isLoading } = useSWR(
    accessToken ? `/api/admin/posts` : null,
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

      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Content</th>
                <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Author</th>
                <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Field</th>
                <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Date</th>
                <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-12 w-64" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-20" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-24" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground text-sm">
                    No content found.
                  </td>
                </tr>
              ) : (
                filteredPosts.map((p: any) => (
                  <tr key={p._id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-4 max-w-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[8px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                            p.contentType === 'article' ? 'bg-accent/10 border-accent/20 text-accent' : 'bg-muted border-border text-muted-foreground'
                          }`}>
                            {p.contentType}
                          </span>
                          {p.title && <p className="text-sm font-medium text-foreground truncate">{p.title}</p>}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{p.body}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-medium text-foreground truncate">@{p.author.username}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{p.author.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded-lg">
                        {p.field?.name || 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a 
                          href={`/post/${p._id}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-accent hover:border-accent transition-all"
                        >
                          <ExternalLink className="w-4 h-4" />
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
        <div className="px-6 py-4 bg-muted/30 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {Math.min(filteredPosts.length, pagination.limit)} of {pagination.total} posts
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
    </div>
  );
}


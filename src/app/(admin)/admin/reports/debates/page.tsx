'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  CheckCircle,
  Search,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';
import { useAuthStore } from '../../../../../store/authStore';
import { Skeleton } from '../../../../../components/ui/Skeleton';
import { Card } from '../../../../../components/ui/Card';
import { Button } from '../../../../../components/ui/Button';
import { Input } from '../../../../../components/ui/Input';
import { fetchWithAuth } from '../../../../../lib/api';
import { toast } from 'sonner';

const fetcher = (url: string) =>
  fetchWithAuth(url).then(r => r.json());

interface DebateReport {
  _id: string;
  reporter: { _id: string; name: string; username: string };
  debate: { _id: string; proposition?: string; arguments?: { body: string }[] };
  reason: string;
  description?: string;
  createdAt: string;
}

export default function AdminDebateReportsPage() {
  const { accessToken } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data, mutate, isLoading } = useSWR(
    accessToken ? '/api/debates/reports' : null,
    fetcher
  );

  const reports: DebateReport[] = data?.data?.reports || data?.reports || [];
  const unresolvedCount = data?.data?.unresolvedCount ?? data?.unresolvedCount ?? reports.length;

  const handleResolve = async (reportId: string) => {
    setActionLoading(reportId);
    try {
      const res = await fetchWithAuth(`/api/debates/reports/${reportId}/resolve`, {
        method: 'PUT',
      });
      if (res.ok) {
        toast.success('Report resolved');
        mutate();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to resolve report');
      }
    } catch {
      toast.error('Failed to resolve report');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredReports = reports.filter((r: DebateReport) =>
    r.reporter?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.reporter?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.debate?.proposition || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.reason.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-blue-500" />
            Debate Reports
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Review and resolve reported debates.
            {unresolvedCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                {unresolvedCount} unresolved
              </span>
            )}
          </p>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
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
                <th className="px-4 sm:px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Reporter</th>
                <th className="px-4 sm:px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hidden sm:table-cell">Debate</th>
                <th className="px-4 sm:px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hidden md:table-cell">Reason</th>
                <th className="px-4 sm:px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hidden lg:table-cell">Description</th>
                <th className="px-4 sm:px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hidden md:table-cell">Date</th>
                <th className="px-4 sm:px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i}>
                    <td className="px-4 sm:px-6 py-4"><Skeleton className="h-6 w-24" /></td>
                    <td className="px-4 sm:px-6 py-4"><Skeleton className="h-6 w-40" /></td>
                    <td className="px-4 sm:px-6 py-4"><Skeleton className="h-6 w-20" /></td>
                    <td className="px-4 sm:px-6 py-4"><Skeleton className="h-6 w-32" /></td>
                    <td className="px-4 sm:px-6 py-4"><Skeleton className="h-6 w-20" /></td>
                    <td className="px-4 sm:px-6 py-4 text-right"><Skeleton className="h-8 w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 sm:px-6 py-12 text-center text-muted-foreground text-sm">
                    No debate reports found.
                  </td>
                </tr>
              ) : (
                filteredReports.map((r: DebateReport) => (
                  <tr key={r._id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-4 sm:px-6 py-4">
                      <p className="text-sm font-medium text-foreground truncate">{r.reporter?.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">@{r.reporter?.username}</p>
                    </td>
                    <td className="px-4 sm:px-6 py-4 hidden sm:table-cell max-w-[200px]">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {r.debate?.proposition || r.debate?.arguments?.[0]?.body?.slice(0, 60) || 'No content'}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          Debate ID: {r.debate?._id}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                      <span className="text-[10px] font-semibold uppercase tracking-widest bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-1 rounded-full">
                        {r.reason}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 hidden lg:table-cell max-w-[180px]">
                      <p className="text-xs text-muted-foreground line-clamp-2">{r.description || '—'}</p>
                    </td>
                    <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/post/${r.debate?._id}?tab=debate`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-accent hover:border-accent transition-all"
                          title="View Debate"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </a>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 rounded-lg border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white text-[10px] font-semibold"
                          onClick={() => handleResolve(r._id)}
                          loading={actionLoading === r._id}
                          title="Resolve Report"
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          Resolve
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

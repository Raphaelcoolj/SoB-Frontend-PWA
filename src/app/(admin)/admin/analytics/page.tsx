'use client';

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  FileText,
  Heart,
  MessageCircle,
  Share2,
  UserCheck,
  Activity,
  AlertTriangle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Target,
} from 'lucide-react';
import { useAuthStore } from '../../../../store/authStore';
import { fetchWithAuth } from '../../../../lib/api';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import type { DailyMetric, DailyMetricsResponse } from '../../../../types/analytics';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const fetcher = (url: string) =>
  fetchWithAuth(url).then((r) => r.json()).then((d) => d.data as DailyMetricsResponse);

function utcDateStr(daysAgo: number) {
  const d = new Date(Date.now() - daysAgo * 86400000);
  return d.toISOString().slice(0, 10);
}

const safe = (n: number | undefined | null): number => (Number.isFinite(n as number) ? (n as number) : 0);
const fmt = (n: number | undefined | null) => safe(n).toLocaleString();
const fmtPct = (n: number | undefined | null) => `${(safe(n) * 100).toFixed(1)}%`;
const fmtMs = (n: number | undefined | null) => `${safe(n).toLocaleString()}ms`;
const fmtSignedPct = (n: number | undefined | null) => {
  const v = safe(n);
  return `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;
};
const fmtDuration = (n: number | undefined | null) => {
  const sec = safe(n);
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
};

export default function AdminAnalyticsPage() {
  const { accessToken } = useAuthStore();
  const [from, setFrom] = useState(utcDateStr(13));
  const [to, setTo] = useState(utcDateStr(0));
  const [downloading, setDownloading] = useState(false);

  const swrKey =
    accessToken ? `${API_URL}/api/admin/analytics/daily?from=${from}&to=${to}` : null;

  const { data, error, isLoading, mutate } = useSWR<DailyMetricsResponse>(
    swrKey,
    fetcher,
    { keepPreviousData: true }
  );

  const summary = useMemo(() => {
    if (!data?.days?.length) return null;
    const days = data.days;
    const count = days.length;
    const sum = (fn: (d: DailyMetric) => number) => days.reduce((a, d) => a + safe(fn(d)), 0);
    const avg = (fn: (d: DailyMetric) => number) => sum(fn) / count;
    return {
      days: count,
      totalNewUsers: sum((d) => d.newUsers),
      avgDAU: avg((d) => d.dau),
      totalSessions: sum((d) => d.sessions),
      totalPostsCreated: sum((d) => d.postsCreated),
      totalLikes: sum((d) => d.likes),
      totalComments: sum((d) => d.comments),
      totalShares: sum((d) => d.shares),
      totalFollows: sum((d) => d.follows),
      totalMessages: sum((d) => d.messagesSent),
      totalNotifications: sum((d) => d.notificationsSent),
      totalApiErrors: sum((d) => d.apiErrors),
      totalClientErrors: sum((d) => d.clientErrors),
      avgLatency: avg((d) => d.averageApiLatency),
      totalEventsProcessed: sum((d) => d.eventsProcessed),
      avgStickiness: avg((d) => d.dauMauRatio),
      avgRetention: avg((d) => d.retentionRate),
      avgChurn: avg((d) => d.churnRate),
      avgNewUserGrowth: avg((d) => d.newUserGrowthRate),
      avgDauGrowth: avg((d) => d.dauGrowthRate),
    };
  }, [data]);

  const handleDownload = async () => {
    if (!accessToken) return;
    setDownloading(true);
    try {
      const res = await fetchWithAuth(
        `${API_URL}/api/admin/analytics/daily/export?from=${from}&to=${to}`
      );
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_daily_${from}_${to}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h3 className="font-medium text-foreground">Failed to load analytics</h3>
        <p className="text-sm text-muted-foreground">
          Please try again later or check your admin permissions.
        </p>
      </div>
    );
  }

  const days = data.days ?? [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Daily Analytics
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Rolled-up KPIs per day. Select a date range and export to CSV.
          </p>
        </div>
      </div>

      {/* Controls */}
      <Card className="p-4 sm:p-6 border-border/60">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                From
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                To
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setFrom(utcDateStr(13)); setTo(utcDateStr(0)); }}
              className="text-xs"
            >
              Last 14 days
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleDownload}
              disabled={downloading || days.length === 0}
              className="text-xs gap-1.5"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Download CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary row */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <SummaryCard label="Avg DAU" value={fmt(Math.round(summary.avgDAU))} icon={UserCheck} color="text-emerald-500" bg="bg-emerald-500/10" />
          <SummaryCard label="Total New Users" value={fmt(summary.totalNewUsers)} icon={Users} color="text-blue-500" bg="bg-blue-500/10" />
          <SummaryCard label="Stickiness" value={fmtPct(summary.avgStickiness)} icon={Target} color="text-amber-500" bg="bg-amber-500/10" />
          <SummaryCard label="Retention" value={fmtPct(summary.avgRetention)} icon={TrendingUp} color="text-emerald-500" bg="bg-emerald-500/10" />
          <SummaryCard label="Avg API Latency" value={fmtMs(Math.round(summary.avgLatency))} icon={BarChart3} color="text-orange-500" bg="bg-orange-500/10" />
          <SummaryCard label="Events Processed" value={fmt(summary.totalEventsProcessed)} icon={FileText} color="text-cyan-500" bg="bg-cyan-500/10" />
        </div>
      )}

      {/* Daily metrics table */}
      <Card className="border-border/60 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-border/60">
          <h3 className="font-medium text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-accent" />
            Daily Breakdown ({days.length} day{days.length !== 1 ? 's' : ''})
          </h3>
        </div>
        {days.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No data for the selected date range.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <Th>Date</Th>
                  <Th>New Users</Th>
                  <Th>DAU</Th>
                  <Th>Sessions</Th>
                  <Th>Posts</Th>
                  <Th>Likes</Th>
                  <Th>Comments</Th>
                  <Th>Shares</Th>
                  <Th>Follows</Th>
                  <Th>Messages</Th>
                  <Th>Notifs Sent</Th>
                  <Th>Errors</Th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.date} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <Td className="font-medium text-foreground">{d.date}</Td>
                    <Td>{fmt(d.newUsers)}</Td>
                    <Td>{fmt(d.dau)}</Td>
                    <Td>{fmt(d.sessions)}</Td>
                    <Td>{fmt(d.postsCreated)}</Td>
                    <Td>{fmt(d.likes)}</Td>
                    <Td>{fmt(d.comments)}</Td>
                    <Td>{fmt(d.shares)}</Td>
                    <Td>{fmt(d.follows)}</Td>
                    <Td>{fmt(d.messagesSent)}</Td>
                    <Td>{fmt(d.notificationsSent)}</Td>
                    <Td>
                      <span className={d.apiErrors + d.clientErrors > 0 ? 'text-red-500 font-semibold' : ''}>
                        {fmt(d.apiErrors + d.clientErrors)}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
              {summary && (
                <tfoot>
                  <tr className="border-t-2 border-border/60 bg-muted/20 font-semibold">
                    <Td className="text-foreground">Totals / Avg</Td>
                    <Td>{fmt(summary.totalNewUsers)}</Td>
                    <Td>{fmt(Math.round(summary.avgDAU))}</Td>
                    <Td>{fmt(summary.totalSessions)}</Td>
                    <Td>{fmt(summary.totalPostsCreated)}</Td>
                    <Td>{fmt(summary.totalLikes)}</Td>
                    <Td>{fmt(summary.totalComments)}</Td>
                    <Td>{fmt(summary.totalShares)}</Td>
                    <Td>{fmt(summary.totalFollows)}</Td>
                    <Td>{fmt(summary.totalMessages)}</Td>
                    <Td>{fmt(summary.totalNotifications)}</Td>
                    <Td>
                      <span className={summary.totalApiErrors + summary.totalClientErrors > 0 ? 'text-red-500' : ''}>
                        {fmt(summary.totalApiErrors + summary.totalClientErrors)}
                      </span>
                    </Td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </Card>

      {/* Extended metrics table */}
      {days.length > 0 && (
        <Card className="border-border/60 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-border/60">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent" />
              Extended Metrics
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <Th>Date</Th>
                  <Th>WAU</Th>
                  <Th>MAU</Th>
                  <Th>DAU/MAU</Th>
                  <Th>Retention</Th>
                  <Th>Churn</Th>
                  <Th>New User Growth</Th>
                  <Th>DAU Growth</Th>
                  <Th>Avg Session</Th>
                  <Th>Published</Th>
                  <Th>Views</Th>
                  <Th>Activation Rate</Th>
                  <Th>Notif Open Rate</Th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.date} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <Td className="font-medium text-foreground">{d.date}</Td>
                    <Td>{fmt(d.wau)}</Td>
                    <Td>{fmt(d.mau)}</Td>
                    <Td>{fmtPct(d.dauMauRatio)}</Td>
                    <Td>{fmtPct(d.retentionRate)}</Td>
                    <Td>{fmtPct(d.churnRate)}</Td>
                    <Td className={safe(d.newUserGrowthRate) > 0 ? 'text-emerald-500 font-medium' : safe(d.newUserGrowthRate) < 0 ? 'text-red-500 font-medium' : ''}>
                      {safe(d.newUserGrowthRate) !== 0 ? fmtSignedPct(d.newUserGrowthRate) : '—'}
                    </Td>
                    <Td className={safe(d.dauGrowthRate) > 0 ? 'text-emerald-500 font-medium' : safe(d.dauGrowthRate) < 0 ? 'text-red-500 font-medium' : ''}>
                      {safe(d.dauGrowthRate) !== 0 ? fmtSignedPct(d.dauGrowthRate) : '—'}
                    </Td>
                    <Td>{fmtDuration(d.averageSessionDuration)}</Td>
                    <Td>{fmt(d.postsPublished)}</Td>
                    <Td>{fmt(d.postsViewed)}</Td>
                    <Td>{fmtPct(d.activationRate)}</Td>
                    <Td>{fmtPct(d.notificationOpenRate)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`px-3 py-2.5 text-muted-foreground whitespace-nowrap ${className ?? ''}`}>
      {children}
    </td>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
}) {
  return (
    <Card className="p-4 border-border/60 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-xl ${bg}`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="text-lg font-semibold text-foreground mt-2">{value}</p>
    </Card>
  );
}

'use client';

/**
 * @file page.tsx (admin/dashboard)
 * @description Admin dashboard showing platform analytics: 
 * DAU/WAU/MAU, activity breakdown, top users, and core stats.
 */

import React from 'react';
import useSWR from 'swr';
import {
  Users, 
  FileText, 
  TrendingUp, 
  BarChart3, 
  UserCheck, 
  Activity,
  Heart,
  MessageCircle,
  Share2,
  UserX,
  Target
} from 'lucide-react';
import { useAuthStore } from '../../../../store/authStore';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { Card } from '../../../../components/ui/Card';
import UserAvatar from '../../../../components/user/UserAvatar';

const fetcher = (url: string, token: string) => 
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.json())
    .then(d => d.data);

export default function AdminDashboardPage() {
  const { accessToken } = useAuthStore();

  const { data: summary, error, isLoading } = useSWR(
    accessToken ? [`${process.env.NEXT_PUBLIC_API_URL}/api/admin/analytics/summary`, accessToken] : null,
    ([url, token]) => fetcher(url, token)
  );

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-3xl">⚠️</div>
        <h3 className="font-medium text-foreground">Failed to load analytics</h3>
        <p className="text-sm text-muted-foreground">Please try again later or check your admin permissions.</p>
      </div>
    );
  }

  const stats = [
    { label: 'DAU', value: summary.dau.count, icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'WAU', value: summary.wau.count, icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'MAU', value: summary.mau.count, icon: BarChart3, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Stickiness', value: `${(summary.dauWauRatio.ratio * 100).toFixed(1)}%`, icon: Activity, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  const breakdown = summary.activityBreakdown;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">Real-time platform performance and user engagement.</p>
      </div>

      {/* Top row stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="p-4 sm:p-6 border-border/60 shadow-sm">
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {stat.label}
              </span>
            </div>
            <div className="mt-3 sm:mt-4">
              <p className="text-xl sm:text-2xl font-semibold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Active users this period</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Activity Breakdown */}
        <Card className="p-4 sm:p-6 border-border/60">
          <h3 className="font-medium text-sm mb-4 sm:mb-6 flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent" />
            Weekly Activity Breakdown
          </h3>
          <div className="space-y-3 sm:space-y-4">
            <ActivityItem icon={FileText} label="Posts & Articles" value={breakdown.post} max={Math.max(...Object.values(breakdown) as number[])} color="bg-accent" />
            <ActivityItem icon={Heart} label="Likes" value={breakdown.like} max={Math.max(...Object.values(breakdown) as number[])} color="bg-red-500" />
            <ActivityItem icon={MessageCircle} label="Comments & Debates" value={breakdown.comment + breakdown.debate} max={Math.max(...Object.values(breakdown) as number[])} color="bg-blue-500" />
            <ActivityItem icon={Share2} label="Shares" value={breakdown.share} max={Math.max(...Object.values(breakdown) as number[])} color="bg-purple-500" />
            <ActivityItem icon={Users} label="Follows" value={breakdown.follow} max={Math.max(...Object.values(breakdown) as number[])} color="bg-emerald-500" />
          </div>
        </Card>

        {/* Top Users */}
        <Card className="p-6 border-border/60 overflow-hidden">
          <h3 className="font-medium text-sm mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Most Active Users (Weekly)
          </h3>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {summary.topUsers.map((item: TopUser, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40 group hover:border-accent/40 transition-all">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-muted-foreground w-4">{i + 1}</span>
                  <UserAvatar avatar={item.avatar} name={item.username} size="sm" />
                  <div>
                    <p className="text-xs font-medium text-foreground truncate max-w-[120px]">@{item.username}</p>
                    <p className="text-[10px] text-muted-foreground">{item.actionCount} actions</p>
                  </div>
                </div>
                <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500" 
                    style={{ width: `${(item.actionCount / summary.topUsers[0].actionCount) * 100}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Overall Platform Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <Card className="p-4 sm:p-8 border-accent/20 bg-accent/5 flex items-center gap-4 sm:gap-6">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-accent/20 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl sm:text-3xl font-semibold text-foreground">{summary.totalUsers}</p>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Members</p>
          </div>
        </Card>
        <Card className="p-4 sm:p-8 border-purple-500/20 bg-purple-500/5 flex items-center gap-4 sm:gap-6">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl sm:text-3xl font-semibold text-foreground">{summary.totalPosts}</p>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Content Items</p>
          </div>
        </Card>
      </div>

      {/* Retention Analytics */}
      <RetentionSection token={accessToken} />
    </div>
  );
}

// ---- Retention analytics (cohort retention, funnel, sessions, churn) ----
type RetentionRow = { weekStart: string; signups: number; retention: number[] };
type Funnel = { rates: Record<string, number>; totalUsers: number };
type TopUser = { username: string; avatar?: string; actionCount: number };
type ChurnUser = { _id: string; username: string; avatar?: string };
type Churn = { dormant: ChurnUser[]; coldStart: ChurnUser[]; currentlyActiveCount: number };
type SessionMetrics = { avgSessionSeconds: number; avgSessionsPerUser: number };
type ActivityItemProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  max: number;
  color: string;
};

function RetentionSection({ token }: { token: string | null }) {
  const base = process.env.NEXT_PUBLIC_API_URL;
  // SWR keys below are absolute URLs (base + path); the fetcher must NOT re-prepend
  // the base or the request URL becomes malformed and never loads.
  const auth = (url: string) => fetcher(url, token ?? '');

  const { data: retention, error: retentionError } = useSWR<RetentionRow[]>(token ? `${base}/api/admin/analytics/retention` : null, auth);
  const { data: funnel, error: funnelError } = useSWR<Funnel>(token ? `${base}/api/admin/analytics/funnel` : null, auth);
  const { data: churn, error: churnError } = useSWR<Churn>(token ? `${base}/api/admin/analytics/churn` : null, auth);
  const { data: sessions, error: sessionsError } = useSWR<SessionMetrics>(token ? `${base}/api/admin/analytics/sessions` : null, auth);

  const anyError = retentionError || funnelError || churnError || sessionsError;
  const hasAny = Boolean(retention || funnel || churn || sessions);
  const stillLoading = !hasAny && !anyError;

  if (stillLoading) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  if (!hasAny) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-2">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
          <Target className="w-5 h-5 text-accent" />
          Retention
        </h2>
        <p className="text-sm text-muted-foreground">
          {anyError
            ? 'Retention analytics could not be loaded. Make sure you are signed in as an admin and try again.'
            : 'No retention data yet.'}
        </p>
      </div>
    );
  }

  const rows = retention ?? [];
  const latest = rows.filter((r) => r.signups > 0);
  const maxRetention = Math.max(1, ...latest.flatMap((r) => r.retention));

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
          <Target className="w-5 h-5 text-accent" />
          Retention
        </h2>
        <p className="text-muted-foreground text-sm mt-1">Weekly cohort retention + re-engagement health (success metric: D7 trending up).</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Cohort retention */}
        <Card className="p-4 sm:p-6 border-border/60">
          <h3 className="font-medium text-sm mb-4">Weekly Cohort Retention</h3>
          {latest.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not enough cohorts yet.</p>
          ) : (
            <div className="space-y-3">
              {latest.map((r) => (
                <div key={String(r.weekStart)} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{new Date(r.weekStart).toISOString().slice(0, 10)}</span>
                    <span>{r.signups} signups</span>
                  </div>
                  <div className="flex gap-1.5">
                    {r.retention.map((val, i) => {
                      const pct = Math.round((val / maxRetention) * 100);
                      return (
                        <div key={i} className="flex-1">
                          <div className="h-16 bg-muted rounded-lg overflow-hidden relative">
                            <div className="absolute bottom-0 left-0 right-0 bg-accent" style={{ height: `${pct}%` }} />
                          </div>
                          <p className="text-center text-[9px] text-muted-foreground mt-1">W{i + 1}</p>
                          <p className="text-center text-[10px] font-semibold text-foreground">{Math.round(val * 100)}%</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Onboarding funnel + sessions */}
        <Card className="p-4 sm:p-6 border-border/60">
          <h3 className="font-medium text-sm mb-4 flex items-center gap-2"><Target className="w-4 h-4 text-accent" /> Onboarding Funnel</h3>
          {funnel && (
            <div className="space-y-2">
              {[
                ['Signup → Onboarded', funnel.rates.signupToOnboarded],
                ['Signup → First Session', funnel.rates.signupToSession],
                ['Signup → First Post', funnel.rates.signupToPost],
                ['Signup → First Engagement', funnel.rates.signupToEngaged],
              ].map(([label, val]) => (
                <div key={label as string} className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground w-40 truncate">{label}</span>
                  <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (val as number) * 3)}%` }} />
                  </div>
                  <span className="text-[10px] font-semibold w-8 text-right">{val}%</span>
                </div>
              ))}
              {sessions && (
                <div className="pt-3 mt-3 border-t border-border/40 grid grid-cols-2 gap-2">
                  <div><p className="text-base font-semibold text-foreground">{sessions.avgSessionSeconds}s</p><p className="text-[10px] text-muted-foreground">Avg session</p></div>
                  <div><p className="text-base font-semibold text-foreground">{sessions.avgSessionsPerUser}</p><p className="text-[10px] text-muted-foreground">Sessions / user</p></div>
                </div>
              )}
            </div>
          )}
          {!funnel && <p className="text-sm text-muted-foreground">No data yet.</p>}
        </Card>
      </div>

      {/* Churn */}
      {churn && (
        <Card className="p-4 sm:p-6 border-border/60">
          <h3 className="font-medium text-sm mb-4 flex items-center gap-2"><UserX className="w-4 h-4 text-red-500" /> Churn / At-Risk ({churn.coldStart.length} cold-start · {churn.dormant.length} dormant)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Cold start (signed up, never returned)</p>
              {churn.coldStart.length === 0 ? <p className="text-sm text-muted-foreground">Great — everyone who signed up has come back.</p> : (
                <div className="space-y-1">
                  {churn.coldStart.slice(0, 8).map((u: ChurnUser) => (
                    <div key={u._id} className="flex items-center gap-2 text-xs">
                      <UserAvatar avatar={u.avatar} name={u.username} size="sm" />
                      <span className="truncate text-muted-foreground">@{u.username}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Dormant (active before, silent 14d+)</p>
              {churn.dormant.length === 0 ? <p className="text-sm text-muted-foreground">No dormant users right now.</p> : (
                <div className="space-y-1">
                  {churn.dormant.slice(0, 8).map((u: ChurnUser) => (
                    <div key={u._id} className="flex items-center gap-2 text-xs">
                      <UserAvatar avatar={u.avatar} name={u.username} size="sm" />
                      <span className="truncate text-muted-foreground">@{u.username}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function ActivityItem({ icon: Icon, label, value, max, color }: ActivityItemProps) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-[10px] font-medium text-foreground truncate">{label}</span>
        </div>
        <span className="text-[10px] font-semibold text-muted-foreground">{value}</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-1000`} 
          style={{ width: `${percentage}%` }} 
        />
      </div>
    </div>
  );
}


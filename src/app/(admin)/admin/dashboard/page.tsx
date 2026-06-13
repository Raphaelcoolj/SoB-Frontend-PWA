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
  Share2
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
    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Real-time platform performance and user engagement.</p>
      </div>

      {/* Top row stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="p-6 border-border/60 shadow-sm">
            <div className="flex items-center justify-between">
              <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {stat.label}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Active users this period</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Breakdown */}
        <Card className="p-6 border-border/60">
          <h3 className="font-medium text-sm mb-6 flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent" />
            Weekly Activity Breakdown
          </h3>
          <div className="space-y-4">
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
            {summary.topUsers.map((item: any, i: number) => (
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-8 border-accent/20 bg-accent/5 flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center">
            <Users className="w-8 h-8 text-accent" />
          </div>
          <div>
            <p className="text-3xl font-semibold text-foreground">{summary.totalUsers}</p>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Members</p>
          </div>
        </Card>
        <Card className="p-8 border-purple-500/20 bg-purple-500/5 flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center">
            <FileText className="w-8 h-8 text-purple-500" />
          </div>
          <div>
            <p className="text-3xl font-semibold text-foreground">{summary.totalPosts}</p>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Content Items</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ActivityItem({ icon: Icon, label, value, max, color }: any) {
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


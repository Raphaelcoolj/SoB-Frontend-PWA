'use client';

/**
 * @file page.tsx (notifications)
 * @description Real-time notifications page showing all user notification events.
 * Fetches from /api/notifications, listens for socket events, and shows mark-all-read.
 */

import React from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from '../../../hooks/useNotifications';
import { useNotificationStore } from '../../../store/notificationStore';
import { useSocket } from '../../../hooks/useSocket';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Button } from '../../../components/ui/Button';
import NotificationItem from '../../../components/notifications/NotificationItem';

export default function NotificationsPage() {
  const { isLoading, markAllAsRead, markAsRead } = useNotifications();
  const { notifications, unreadCount } = useNotificationStore();
  useSocket(); // Activate real-time listener

  return (
    <div className="space-y-4 pb-20 pt-2">
      <div className="flex items-center justify-between px-1">
        <div>
          {unreadCount > 0 && (
            <p className="text-[10px] font-medium text-accent uppercase tracking-widest mt-0.5">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-8 text-[10px] font-medium uppercase tracking-widest gap-2 hover:bg-accent/10 hover:text-accent">
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border">
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2.5 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-in fade-in duration-700">
          <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center shadow-inner">
            <Bell className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground">All caught up!</h3>
            <p className="text-sm text-muted-foreground max-w-[200px] leading-relaxed">
              You have no notifications right now. Engage with the community to get the conversation started.
            </p>
          </div>
        </div>
      )}

      {/* Notifications list */}
      {!isLoading && notifications.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm divide-y divide-border/50">
          {notifications.map((n) => (
            <NotificationItem key={n._id} notification={n} onMarkAsRead={markAsRead} />
          ))}
        </div>
      )}
    </div>
  );
}



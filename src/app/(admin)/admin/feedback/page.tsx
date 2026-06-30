'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { MessageSquare, Mail, User, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuthStore } from '../../../../store/authStore';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { Card } from '../../../../components/ui/Card';
import { fetchWithAuth } from '../../../../lib/api';

const fetcher = (url: string) =>
  fetchWithAuth(url).then(r => r.json()).then(d => d.data);

export default function AdminFeedbackPage() {
  const { accessToken } = useAuthStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useSWR(
    accessToken ? '/api/feedback' : null,
    fetcher
  );

  const messages = data?.messages || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-accent" />
          Feedback
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Messages and inquiries submitted via the contact form.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : messages.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground text-sm border-dashed">
          <Mail className="w-8 h-8 mx-auto mb-3 opacity-40" />
          No feedback messages yet.
        </Card>
      ) : (
        <div className="space-y-3">
          {messages.map((msg: any) => {
            const isExpanded = expandedId === msg._id;
            return (
              <div key={msg._id} className="bg-card border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : msg._id)}
                  className="w-full flex items-start justify-between p-4 hover:bg-muted/30 transition-colors text-left cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        msg.subject === 'report' ? 'bg-destructive/10 text-destructive' :
                        msg.subject === 'support' ? 'bg-amber-500/10 text-amber-600' :
                        msg.subject === 'legal' ? 'bg-purple-500/10 text-purple-600' :
                        'bg-accent/10 text-accent'
                      }`}>
                        {msg.subject}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {new Date(msg.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground font-medium mt-1 truncate">
                      {msg.name} &lt;{msg.email}&gt;
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {msg.message?.slice(0, 120)}
                    </p>
                  </div>
                  <div className="flex-shrink-0 ml-3 mt-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-border">
                    <div className="mt-3 p-4 bg-muted/30 rounded-xl">
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5"><User className="w-3 h-3" /> {msg.name}</span>
                      <span className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {msg.email}</span>
                      {msg.user && <span className="text-accent">User ID: {msg.user}</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

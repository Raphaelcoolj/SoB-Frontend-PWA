'use client';

/**
 * @file page.tsx (admin/broadcast)
 * @description Admin email broadcast tool. Allows administrators to send 
 * platform-wide email notifications to all registered users.
 */

import React, { useState } from 'react';
import { 
  Radio, 
  Send, 
  AlertTriangle, 
  CheckCircle2, 
  Mail,
  Type
} from 'lucide-react';
import { useAuthStore } from '../../../../store/authStore';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Label } from '../../../../components/ui/Label';
import { api } from '../../../../lib/api';

export default function AdminBroadcastPage() {
  const { accessToken } = useAuthStore();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !subject.trim() || !body.trim()) return;

    if (!confirm('This will send an email to ALL registered users. Are you sure you want to proceed?')) return;

    setSubmitting(true);
    setStatus(null);

    try {
      const res = await api.post('/api/admin/email/broadcast', { subject, body }, accessToken);
      const data = await res.json();

      if (res.ok) {
        setStatus({ type: 'success', message: data.message || 'Broadcast started successfully!' });
        setSubject('');
        setBody('');
      } else {
        throw new Error(data.message || 'Failed to send broadcast');
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground flex items-center gap-3">
          <Radio className="w-8 h-8 text-orange-500" />
          Broadcast
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Send platform-wide announcements via email.</p>
      </div>

      <Card className="p-8 border-border/60 shadow-sm space-y-8">
        {status && (
          <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in slide-in-from-top-2 ${
            status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-destructive/10 border-destructive/20 text-destructive'
          }`}>
            {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <p className="text-sm font-medium">{status.message}</p>
          </div>
        )}

        <div className="bg-muted/30 p-4 rounded-xl border border-dashed border-border flex gap-4">
          <div className="bg-orange-500/10 p-3 rounded-xl h-fit">
            <AlertTriangle className="w-6 h-6 text-orange-500" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground">High Importance</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Broadcast emails are sent immediately to all users who have an email address on record. 
              Please ensure your message is accurate and professionally formatted.
            </p>
          </div>
        </div>

        <form onSubmit={handleBroadcast} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">
              Email Subject
            </Label>
            <div className="relative">
              <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                id="subject"
                placeholder="Important: New Platform Update" 
                className="pl-10 h-12 rounded-xl text-sm font-medium"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="body" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">
              Email Content
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-4 w-4 h-4 text-muted-foreground" />
              <textarea 
                id="body"
                placeholder="Write your announcement here..." 
                className="w-full min-h-[300px] pl-10 pr-4 py-4 bg-background border border-input rounded-xl text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
            </div>
            <p className="text-[10px] text-muted-foreground px-1 italic">
              Basic HTML line breaks will be applied automatically.
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full h-14 text-base font-semibold uppercase tracking-widest gap-2 bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-600/20"
            loading={submitting}
            disabled={!subject.trim() || !body.trim()}
          >
            <Send className="w-5 h-5" />
            Launch Broadcast
          </Button>
        </form>
      </Card>

      <div className="text-center">
        <p className="text-[10px] text-muted-foreground font-medium">
          Sent from SoB Administration Panel &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}


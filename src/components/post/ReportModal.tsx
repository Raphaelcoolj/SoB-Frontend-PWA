'use client';

import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '../../lib/api';

interface ReportModalProps {
  postId: string;
  onClose: () => void;
}

const REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'hate_speech', label: 'Hate speech' },
  { value: 'violence', label: 'Violence' },
  { value: 'sexual_content', label: 'Sexual content' },
  { value: 'self_harm', label: 'Self-harm' },
  { value: 'other', label: 'Other' },
];

export default function ReportModal({ postId, onClose }: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      const res = await fetchWithAuth('/api/reports', {
        method: 'POST',
        body: JSON.stringify({ postId, reason, description }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Report submitted. Our team will review it.');
        onClose();
      } else {
        toast.error(data.message || 'Failed to submit report.');
      }
    } catch {
      toast.error('Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-background border border-border shadow-xl w-full md:max-w-md md:rounded-2xl rounded-t-2xl md:mx-4 overflow-hidden max-h-[90dvh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold">Report Post</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-2 -mr-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          <p className="text-sm text-muted-foreground">Why are you reporting this post?</p>

          <div className="space-y-2">
            {REASONS.map((r) => (
              <label
                key={r.value}
                className={`flex items-center gap-3 p-3.5 md:p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.98] ${
                  reason === r.value
                    ? 'border-red-500/40 bg-red-500/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={(e) => setReason(e.target.value)}
                  className="text-red-500 focus:ring-red-500 shrink-0"
                />
                <span className="text-sm font-medium">{r.label}</span>
              </label>
            ))}
          </div>

          <textarea
            placeholder="Additional details (optional)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500/30"
          />

          <div className="flex gap-3 pt-2 pb-safe">
            <button
              onClick={onClose}
              className="flex-1 h-11 md:h-10 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!reason || submitting}
              className="flex-1 h-11 md:h-10 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

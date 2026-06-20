'use client';

/**
 * @file BlockButton.tsx
 * @description Block / Unblock toggle button for user profiles.
 * Shows a confirmation bottom-sheet on mobile before blocking.
 * Calls POST /api/users/:id/block.
 */

import React, { useState } from 'react';
import { ShieldOff, ShieldCheck, X, AlertTriangle } from 'lucide-react';
import { fetchWithAuth } from '../../lib/api';
import { toast } from 'sonner';

interface BlockButtonProps {
  targetUserId: string;
  targetUsername: string;
  initialIsBlocked: boolean;
  onBlockChange?: (isBlocked: boolean) => void;
}

export const BlockButton = ({
  targetUserId,
  targetUsername,
  initialIsBlocked,
  onBlockChange,
}: BlockButtonProps) => {
  const [isBlocked, setIsBlocked] = useState(initialIsBlocked);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const executeBlock = async () => {
    setLoading(true);
    const previous = isBlocked;
    setIsBlocked(!isBlocked);
    setShowConfirm(false);

    try {
      const res = await fetchWithAuth(`/api/users/${targetUserId}/block`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setIsBlocked(previous);
        toast.error('Failed to update block status');
      } else {
        setIsBlocked(data.data.isBlocked);
        onBlockChange?.(data.data.isBlocked);
        toast.success(data.data.isBlocked ? `Blocked @${targetUsername}` : `Unblocked @${targetUsername}`);
      }
    } catch {
      setIsBlocked(previous);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    if (!isBlocked) {
      // Show confirmation before blocking
      setShowConfirm(true);
    } else {
      executeBlock();
    }
  };

  return (
    <>
      {/* Block/Unblock Button */}
      <button
        onClick={handleClick}
        disabled={loading}
        aria-label={isBlocked ? 'Unblock user' : 'Block user'}
        className={`
          inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold
          border transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer
          ${isBlocked
            ? 'border-border bg-card text-muted-foreground hover:border-emerald-500/50 hover:text-emerald-600 hover:bg-emerald-500/5'
            : 'border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10'
          }
        `}
      >
        {loading ? (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : isBlocked ? (
          <ShieldCheck className="w-3.5 h-3.5" />
        ) : (
          <ShieldOff className="w-3.5 h-3.5" />
        )}
        {isBlocked ? 'Unblock' : 'Block'}
      </button>

      {/* Confirmation Bottom Sheet (mobile-first) */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Block user confirmation"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowConfirm(false)}
          />

          {/* Sheet */}
          <div className="relative z-10 w-full max-w-sm mx-4 mb-4 sm:mb-0 bg-card border border-border rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <button
              onClick={() => setShowConfirm(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <ShieldOff className="w-7 h-7 text-destructive" />
              </div>

              <div className="space-y-1">
                <h2 className="text-base font-bold text-foreground">
                  Block @{targetUsername}?
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                  They won&apos;t see your posts and you won&apos;t see theirs. You will also unfollow each other.
                </p>
              </div>

              <div className="w-full space-y-2 pt-1">
                <button
                  onClick={executeBlock}
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-destructive text-white text-sm font-semibold hover:bg-destructive/90 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Blocking...' : 'Block User'}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="w-full py-3 rounded-xl bg-muted text-foreground text-sm font-semibold hover:bg-muted/80 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BlockButton;

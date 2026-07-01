'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2, AlertTriangle } from 'lucide-react';
import { Logo } from '../../components/shared/Logo';
import { useAuthStore } from '../../store/authStore';
import { fetchWithAuth } from '../../lib/api';
import { Button } from '../../components/ui/Button';

export default function DeleteAccountPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  if (!user) {
    return (
      <div className="min-h-screen bg-background p-6 lg:p-20">
        <div className="max-w-md mx-auto text-center space-y-4 pt-20">
          <Logo />
          <h1 className="text-xl font-semibold text-foreground">Sign in to delete your account</h1>
          <p className="text-sm text-muted-foreground">You need to be logged in to delete your account. Please sign in from the app or visit the web login page.</p>
          <Link href="/login" className="inline-flex items-center gap-2 text-sm text-accent hover:underline">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return;
    setDeleting(true);
    setError('');
    try {
      const res = await fetchWithAuth('/api/users/me', { method: 'DELETE' });
      if (res.ok) {
        useAuthStore.getState().clearAuth();
        router.replace('/register');
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to delete account.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 lg:p-20">
      <div className="max-w-md mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <Logo />
          <Link href="/settings/account" className="text-xs font-medium text-muted-foreground hover:text-accent flex items-center gap-2 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Link>
        </header>

        <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Delete Account</h1>
              <p className="text-xs text-muted-foreground">This action cannot be undone</p>
            </div>
          </div>

          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1 text-destructive/90">
              <p className="font-semibold">What will be deleted:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>All your posts and articles</li>
                <li>All your comments and replies</li>
                <li>Your likes, bookmarks, and shares</li>
                <li>Your followers and following lists</li>
                <li>Your notifications and activity history</li>
                <li>Your profile information</li>
              </ul>
              <p className="pt-2 font-semibold">This is permanent. There is no recovery.</p>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="confirm" className="text-xs font-medium text-foreground">
              Type <span className="font-bold text-destructive">DELETE</span> to confirm
            </label>
            <input
              id="confirm"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30"
              placeholder="Type DELETE here"
            />
          </div>

          <Button
            variant="destructive"
            disabled={confirmText !== 'DELETE' || deleting}
            loading={deleting}
            onClick={handleDelete}
            className="w-full gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? 'Deleting...' : 'Permanently Delete My Account'}
          </Button>
        </div>

        <footer className="pt-6 border-t border-border">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest text-center">
            &copy; 2026 Sphere of Brilliance
          </p>
        </footer>
      </div>
    </div>
  );
}

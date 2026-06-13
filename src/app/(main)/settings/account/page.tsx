'use client';

/**
 * @file page.tsx (settings/account)
 * @description Account management: password, sign out, delete account.
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Trash2, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../../store/authStore';
import { useAuth } from '../../../../hooks/useAuth';
import { fetchWithAuth } from '../../../../lib/api';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Label } from '../../../../components/ui/Label';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Confirm your new password'),
}).refine(d => d.newPassword === d.confirmPassword, { message: 'Passwords must match', path: ['confirmPassword'] });

type PasswordValues = z.infer<typeof passwordSchema>;

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const passwordForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  const onPasswordSave = async (values: PasswordValues) => {
    setPasswordStatus(null);
    const res = await fetchWithAuth('/api/users/me', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword: values.currentPassword, password: values.newPassword }),
    });
    const data = await res.json();
    if (res.ok) { setPasswordStatus('Password changed successfully!'); passwordForm.reset(); }
    else setPasswordStatus(data.message || 'Failed to change password.');
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    const res = await fetchWithAuth('/api/users/me', { method: 'DELETE' });
    if (res.ok) {
      useAuthStore.getState().clearAuth();
      router.replace('/register');
    }
    setDeleting(false);
  };

  const isGoogleUser = !!user?.googleId;

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center gap-3 pt-2">
        <Link href="/settings" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Account</h1>
      </div>

      {/* Password change (only for email users) */}
      {!isGoogleUser && (
        <section className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-medium text-foreground">Change Password</h2>
          {passwordStatus && (
            <div className={`text-sm p-3 rounded-lg border ${passwordStatus.includes('success') ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
              {passwordStatus}
            </div>
          )}
          <form onSubmit={passwordForm.handleSubmit(onPasswordSave)} className="space-y-3">
            {[
              { id: 'currentPassword', label: 'Current Password', field: 'currentPassword' as const },
              { id: 'newPassword', label: 'New Password', field: 'newPassword' as const },
              { id: 'confirmPassword', label: 'Confirm New Password', field: 'confirmPassword' as const },
            ].map(({ id, label, field }) => (
              <div key={id} className="space-y-1">
                <Label htmlFor={id}>{label}</Label>
                <Input id={id} type="password" {...passwordForm.register(field)} error={!!passwordForm.formState.errors[field]} />
                {passwordForm.formState.errors[field] && (
                  <p className="text-xs text-destructive">{String(passwordForm.formState.errors[field]?.message)}</p>
                )}
              </div>
            ))}
            <Button type="submit" variant="default" loading={passwordForm.formState.isSubmitting}>Update Password</Button>
          </form>
        </section>
      )}

      {/* Logout */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="font-medium text-foreground">Sign Out</h2>
        <Button variant="outline" onClick={logout} className="w-full gap-2 text-destructive border-destructive hover:bg-destructive hover:text-white">
            <LogOut className="w-4 h-4" />
            Log Out
        </Button>
      </section>

      {/* Delete account */}
      <section className="bg-destructive/5 border border-destructive/20 rounded-xl p-5 space-y-3">
        <h2 className="font-medium text-destructive">Danger Zone</h2>
        <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data. This action cannot be undone.</p>
        <Button variant="destructive" size="sm" onClick={() => setShowDeleteModal(true)}>
          <Trash2 className="w-4 h-4 mr-2" /> Delete Account
        </Button>
      </section>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="font-semibold text-lg text-foreground">Delete Account?</h3>
            <p className="text-sm text-muted-foreground">All your posts, comments, and data will be permanently removed. There's no going back.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" loading={deleting} onClick={handleDeleteAccount}>
                Delete Forever
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


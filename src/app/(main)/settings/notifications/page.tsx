'use client';

/**
 * @file page.tsx (settings/notifications)
 * @description Notification preferences. Allows turning email notifications on/off
 * and selecting which specific fields trigger email alerts.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowLeft, Mail, AlertTriangle, Bell } from 'lucide-react';
import { useAuthStore } from '../../../../store/authStore';
import { Button } from '../../../../components/ui/Button';
import { Field } from '../../../../types/user';
import { fetchWithAuth } from '../../../../lib/api';
import { urlBase64ToUint8Array } from '../../../../lib/push';
import { toast } from 'sonner';

const BASE = process.env.NEXT_PUBLIC_API_URL;

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(d => d.data);

export default function NotificationSettingsPage() {
  const { user, accessToken, setUser } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  // Form state
  const [isEmailEnabled, setIsEmailEnabled] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  // Fetch all available fields
  const { data: fieldsData } = useSWR(`${BASE}/api/fields`, fetcher, { revalidateOnFocus: false });
  const allFields: Field[] = fieldsData?.fields || fieldsData || [];

  // Initialize form state from user object
  useEffect(() => {
    if (user) {
      setIsEmailEnabled(!!user.emailNotifications?.length);
      const userEmailFields = (user.emailNotifications || []).map(f => typeof f === 'string' ? f : f._id);
      setSelectedFields(userEmailFields);
      setIsPushEnabled(!!user.pushSubscription?.endpoint);
    }
  }, [user]);

  const enablePushNotifications = async () => {
    setIsPushLoading(true);
    setPushError(null);

    try {
      // Step 1: Check browser support
      if (!('Notification' in window)) {
        throw new Error('Push notifications are not supported in this browser');
      }

      if (!('serviceWorker' in navigator)) {
        throw new Error('Service workers are not supported in this browser');
      }

      // Step 2: Request permission with timeout
      const permissionResult = await Promise.race([
        Notification.requestPermission(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Permission request timed out')), 10000)
        )
      ]);

      if (permissionResult !== 'granted') {
        throw new Error('Push notification permission denied');
      }

      // Step 3: Wait for service worker with timeout
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Service worker not ready')), 10000)
        )
      ]);

      // Step 4: Subscribe to push
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error('VAPID public key not configured');

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });

      // Step 5: Send subscription to backend
      const response = await fetchWithAuth('/api/users/push-subscription', {
        method: 'POST',
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to save push subscription');
      }

      setIsPushEnabled(true);
      toast.success('Push notifications enabled!');

      // Refresh user state
      const meRes = await fetchWithAuth('/api/users/me', { method: 'GET' });
      const meData = await meRes.json();
      if (meRes.ok) setUser(meData.data.user);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to enable push notifications';
      setPushError(message);
      toast.error(message);
      console.error('Push notification error:', error);
    } finally {
      setIsPushLoading(false);
    }
  };

  const toggleField = (fieldId: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldId) ? prev.filter(id => id !== fieldId) : [...prev, fieldId]
    );
  };

  const handleSave = async () => {
    if (!accessToken) return;
    setSaving(true);

    try {
      const finalFields = isEmailEnabled ? selectedFields : [];
      const res = await fetchWithAuth('/api/users/me/notifications', { 
        method: 'PUT', 
        body: JSON.stringify({ emailNotifications: finalFields }) 
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update preferences');
      
      // Refresh user state
      const meRes = await fetchWithAuth('/api/users/me', { method: 'GET' });
      const meData = await meRes.json();
      if (meRes.ok) setUser(meData.data.user);

      toast.success('Preferences saved successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-3 pt-2">
        <Link href="/settings" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Notifications</h1>
      </div>

      <section className="bg-card border border-border rounded-xl p-5 space-y-5">
        {/* Push Notification toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">Push Notifications</p>
              <p className="text-xs text-muted-foreground truncate">
                {isPushEnabled ? 'Notifications enabled' : 'Receive updates in your browser.'}
              </p>
            </div>
          </div>
          <Button 
            onClick={enablePushNotifications} 
            loading={isPushLoading} 
            variant={isPushEnabled ? "ghost" : "outline"} 
            size="sm"
            disabled={isPushEnabled}
          >
            {isPushEnabled ? 'Enabled' : 'Enable'}
          </Button>
        </div>

        {pushError && (
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20 animate-in fade-in slide-in-from-top-1">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{pushError}</span>
          </div>
        )}

        {/* Master email toggle */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="font-medium text-foreground">Email Summaries</p>
              <p className="text-xs text-muted-foreground">Receive weekly digests of top content.</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={isEmailEnabled} onChange={(e) => setIsEmailEnabled(e.target.checked)} />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
          </label>
        </div>

        {/* Field selection */}
        {isEmailEnabled && (
          <div className="pt-4 border-t border-border space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Which fields do you want emails about?</h3>
            {allFields.length === 0 ? (
              <p className="text-xs text-muted-foreground">Loading fields...</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {allFields.map(f => {
                  const isSelected = selectedFields.includes(f._id);
                  return (
                    <button
                      key={f._id}
                      onClick={() => toggleField(f._id)}
                      className={`text-left px-3 py-2 rounded-lg border text-sm transition-all duration-200 cursor-pointer ${
                        isSelected ? 'bg-accent/10 border-accent/40 text-accent font-semibold' : 'bg-background border-border text-muted-foreground hover:border-accent/40'
                      }`}
                    >
                      {f.name}
                    </button>
                  );
                })}
              </div>
            )}
            {selectedFields.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-400/10 p-2 rounded-lg border border-orange-400/20">
                <AlertTriangle className="w-4 h-4" />
                <span>You won't receive emails until you select at least one field.</span>
              </div>
            )}
          </div>
        )}

        <Button onClick={handleSave} loading={saving} className="w-full">
          Save Preferences
        </Button>
      </section>
    </div>
  );
}

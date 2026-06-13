'use client';

/**
 * @file page.tsx (settings/notifications)
 * @description Notification preferences. Allows turning email notifications on/off
 * and selecting which specific fields trigger email alerts.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowLeft, Mail, AlertTriangle, Bell, Loader2, X } from 'lucide-react';
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

  const togglePushNotifications = async (enabled: boolean) => {
    if (enabled) {
      await enablePushNotifications();
    } else {
      await disablePushNotifications();
    }
  };

  const enablePushNotifications = async () => {
    setIsPushLoading(true);
    setPushError(null);
    try {
      if (!('Notification' in window)) {
        throw new Error('Browser does not support notifications');
      }
      if (!('serviceWorker' in navigator)) {
        throw new Error('Browser does not support service workers');
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Permission denied');

      console.log('Registering service worker...');
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      
      console.log('Waiting for SW readiness...');
      await navigator.serviceWorker.ready;
      console.log('SW ready.');

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error('VAPID key not configured');

      // Check if subscription already exists
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        console.log('No existing subscription, creating new one...');
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) throw new Error('VAPID key not configured');

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey)
        });
      }

      console.log('Sending to backend...');
      const response = await fetchWithAuth('/api/users/push-subscription', {
        method: 'POST',
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Backend rejected subscription:', errorData);
        throw new Error(errorData.message || 'Failed to save subscription');
      }

      console.log('Subscription saved successfully');
      setIsPushEnabled(true);
      toast.success('Push notifications enabled!');
      
      // Refresh user state
      const meRes = await fetchWithAuth('/api/users/me', { method: 'GET' });
      const meData = await meRes.json();
      if (meRes.ok) setUser(meData.data.user);
    } catch (error) {
      console.error('Push error:', error);
      const message = error instanceof Error ? error.message : String(error);
      setPushError(message);
      toast.error('Push failed: ' + message);
      setIsPushEnabled(false);
    } finally {
      setIsPushLoading(false);
    }
  };

  const disablePushNotifications = async () => {
    setIsPushLoading(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) await subscription.unsubscribe();
      }
      await fetchWithAuth('/api/users/push-subscription', { method: 'DELETE' });
      setIsPushEnabled(false);
      toast.success('Push notifications disabled');
    } catch (error) {
      setPushError('Failed to disable notifications');
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
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={isPushEnabled}
              disabled={isPushLoading}
              onChange={(e) => togglePushNotifications(e.target.checked)}
            />
            <div className={`w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${isPushLoading ? 'opacity-50' : ''} peer-checked:bg-blue-500`}></div>
            {isPushLoading && <Loader2 className="w-4 h-4 animate-spin ml-2 text-blue-500" />}
          </label>
        </div>

        {pushError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg mt-2">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400 flex-1">{pushError}</p>
            <button
              onClick={() => setPushError(null)}
              className="text-red-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
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

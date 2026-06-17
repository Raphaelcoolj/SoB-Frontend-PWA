'use client';

/**
 * @file page.tsx (settings/fields)
 * @description Priority fields management. Users must maintain exactly 5 priority fields.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowLeft, BookOpen, Check, AlertCircle, Search } from 'lucide-react';
import { useAuthStore } from '../../../../store/authStore';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Field } from '../../../../types/user';
import { fetchWithAuth } from '../../../../lib/api';

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(d => d.data);

export default function PriorityFieldsPage() {
  const { user, accessToken, setUser } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Local state for selected fields (initially from user)
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  // Fetch all available fields
  const { data: fieldsData, error: fieldsError } = useSWR(`${process.env.NEXT_PUBLIC_API_URL}/api/fields`, fetcher);
  const allFields: Field[] = fieldsData?.fields || fieldsData || [];

  // Initialize from user object
  useEffect(() => {
    if (user?.priorityFields) {
      setSelectedFields(user.priorityFields.map(f => typeof f === 'string' ? f : f._id));
    }
  }, [user]);

  const toggleField = (fieldId: string) => {
    setSelectedFields(prev => {
      if (prev.includes(fieldId)) {
        return prev.filter(id => id !== fieldId);
      } else {
        if (prev.length >= 10) {
          setStatus({ message: 'You can select a maximum of 10 fields.', type: 'error' });
          setTimeout(() => setStatus(null), 3000);
          return prev;
        }
        return [...prev, fieldId];
      }
    });
  };

  const handleSave = async () => {
    if (!accessToken) return;
    if (selectedFields.length < 2 || selectedFields.length > 10) {
      setStatus({ message: 'You must select between 2 and 10 fields.', type: 'error' });
      return;
    }

    setSaving(true);
    setStatus(null);

    try {
      const res = await fetchWithAuth('/api/users/me/fields', { 
        method: 'PUT', 
        body: JSON.stringify({ priorityFields: selectedFields }) 
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to update fields');

      // Update local store user
      if (user) {
        const meRes = await fetchWithAuth('/api/users/me', { method: 'GET' });
        const meData = await meRes.json();
        if (meRes.ok) setUser(meData.data.user);
      }

      setStatus({ message: 'Priority fields updated successfully!', type: 'success' });
      setTimeout(() => setStatus(null), 3000);
    } catch (err: any) {
      setStatus({ message: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const filteredFields = allFields.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3 pt-2">
        <Link href="/settings" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Priority Fields</h1>
      </div>

      <section className="bg-card border border-border rounded-xl p-5 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="font-medium text-foreground">Your Interests</p>
            <p className="text-xs text-muted-foreground">These determine what you see in your feed.</p>
          </div>
        </div>

        {status && (
          <div className={`flex items-center gap-2 text-sm p-3 rounded-lg border ${
            status.type === 'success' 
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
              : 'bg-destructive/10 text-destructive border-destructive/20'
          }`}>
            {status.type === 'error' && <AlertCircle className="w-4 h-4" />}
            <span>{status.message}</span>
          </div>
        )}

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search fields..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-1">
            {fieldsError ? (
              <p className="col-span-2 text-center py-10 text-destructive text-sm">Failed to load fields.</p>
            ) : allFields.length === 0 ? (
              <p className="col-span-2 text-center py-10 text-muted-foreground text-sm">Loading...</p>
            ) : filteredFields.length === 0 ? (
              <p className="col-span-2 text-center py-10 text-muted-foreground text-sm">No fields found.</p>
            ) : (
              filteredFields.map(f => {
                const isSelected = selectedFields.includes(f._id);
                return (
                  <button
                    key={f._id}
                    onClick={() => toggleField(f._id)}
                    className={`flex items-center justify-between px-3 py-3 rounded-xl border text-left transition-all duration-200 ${
                      isSelected 
                        ? 'bg-accent border-accent text-white font-medium' 
                        : 'bg-background border-border text-foreground hover:border-accent/40'
                    }`}
                  >
                    <span className="truncate text-xs">{f.name}</span>
                    {isSelected && <Check className="w-3 h-3 flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-border flex flex-col gap-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs text-muted-foreground">Selected: {selectedFields.length}</span>
            {(selectedFields.length < 2 || selectedFields.length > 10) && (
              <span className="text-[10px] text-orange-400 font-medium">Select 2-10 to save</span>
            )}
          </div>
          <Button 
            onClick={handleSave} 
            loading={saving} 
            disabled={selectedFields.length < 2 || selectedFields.length > 10}
            className="w-full"
          >
            Update Fields
          </Button>
        </div>
      </section>
    </div>
  );
}

'use client';

/**
 * @file page.tsx (admin/fields)
 * @description Admin field management. Allows adding new learning fields
 * and deleting existing ones.
 */

import React, { useState } from 'react';
import useSWR from 'swr';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Search,
  AlertCircle,
  Shield,
  ShieldAlert
} from 'lucide-react';
import { useAuthStore } from '../../../../store/authStore';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { fetchWithAuth } from '../../../../lib/api';

const fetcher = async (url: string) => {
  const res = await fetchWithAuth(url.replace(process.env.NEXT_PUBLIC_API_URL || '', ''));
  const d = await res.json();
  return d.data;
};

export default function AdminFieldsPage() {
  const { accessToken } = useAuthStore();
  const [newName, setNewName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [boostInputs, setBoostInputs] = useState<Record<string, number>>({});

  const { data: fieldsData, mutate, isLoading } = useSWR(
    `${process.env.NEXT_PUBLIC_API_URL}/api/fields`,
    fetcher
  );

  const fields = fieldsData?.fields || fieldsData || [];

  const handleBoostChange = async (fieldId: string, newBoost: number) => {
    setActionLoading(fieldId);
    try {
      const response = await fetchWithAuth(`/api/admin/fields/${fieldId}/boost`, {
        method: 'PUT',
        body: JSON.stringify({ boostWeight: newBoost }),
      });
      if (response.ok) {
        mutate();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetchWithAuth('/api/fields', {
        method: 'POST',
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        setNewName('');
        mutate();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('Are you sure? This might affect users who have this as a priority field.')) return;
    setActionLoading(fieldId);
    try {
      const res = await fetchWithAuth(`/api/fields/${fieldId}`, { method: 'DELETE' });
      if (res.ok) mutate();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleSensitivity = async (fieldId: string, currentStatus: boolean) => {
    setActionLoading(fieldId);
    try {
      const res = await fetchWithAuth(`/api/admin/fields/${fieldId}/sensitivity`, {
        method: 'PUT',
        body: JSON.stringify({ isSensitive: !currentStatus })
      });
      if (res.ok) mutate();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTogglePriorityOnly = async (fieldId: string, currentStatus: boolean) => {
    setActionLoading(fieldId);
    try {
      const res = await fetchWithAuth(`/api/admin/fields/${fieldId}/priority-only`, {
        method: 'PUT',
        body: JSON.stringify({ isPriorityOnly: !currentStatus })
      });
      if (res.ok) mutate();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredFields = fields.filter((f: any) => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-accent" />
            Fields
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage the topics and learning categories available on SoB.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add New Field */}
        <Card className="p-6 border-border/60 shadow-sm h-fit">
          <h3 className="font-medium text-sm mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-accent" />
            Add New Field
          </h3>
          <form onSubmit={handleCreateField} className="space-y-4">
            <div className="space-y-1.5">
              <Input 
                placeholder="Field name (e.g. Quantum Physics)" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={submitting}
              />
              <p className="text-[10px] text-muted-foreground px-1">
                Names should be concise and unique.
              </p>
            </div>
            <Button type="submit" className="w-full" loading={submitting} disabled={!newName.trim()}>
              Create Field
            </Button>
          </form>

          <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <p className="text-[10px] text-orange-600 font-medium leading-relaxed">
              Careful: Deleting fields is permanent and will remove them from all user profiles and posts.
            </p>
          </div>
        </Card>

        {/* Fields List */}
        <Card className="lg:col-span-2 overflow-hidden border-border/60 shadow-sm">
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search existing fields..." 
                className="pl-10 h-10 border-none bg-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="divide-y divide-border/60 max-h-[600px] overflow-y-auto">
            {isLoading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="p-4 flex items-center justify-between">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              ))
            ) : filteredFields.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm italic">
                No fields matching your search.
              </div>
            ) : (
              filteredFields.map((f: any) => (
                <div key={f._id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{f.name}</p>
                        {f.isSensitive && (
                          <span className="flex items-center gap-1 text-red-600 dark:text-red-400 text-[8px] font-bold uppercase tracking-wider bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 shadow-sm">
                            <ShieldAlert className="w-2.5 h-2.5" />
                            Sensitive
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">slug: {f.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleToggleSensitivity(f._id, f.isSensitive)}
                      disabled={actionLoading === f._id}
                      className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-all ${
                        f.isSensitive ? 'border-red-200 bg-red-50 text-red-500 hover:bg-red-100' : 'border-border text-muted-foreground hover:bg-muted'
                      }`}
                      title={f.isSensitive ? "Mark as Safe" : "Mark as Sensitive"}
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleTogglePriorityOnly(f._id, f.isPriorityOnly)}
                      disabled={actionLoading === f._id}
                      className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-all ${
                        f.isPriorityOnly ? 'border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100' : 'border-border text-muted-foreground hover:bg-muted'
                      }`}
                      title={f.isPriorityOnly ? "Disable Priority Only" : "Enable Priority Only"}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Boost:</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="5.0"
                        value={boostInputs[f._id] ?? f.boostWeight ?? 1.0}
                        onChange={(e) => setBoostInputs(prev => ({ ...prev, [f._id]: parseFloat(e.target.value) }))}
                        className="w-14 h-7 px-2 rounded-lg border border-border bg-card text-xs focus:ring-1 focus:ring-accent outline-none"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[10px] rounded-lg border-accent/30 text-accent hover:bg-accent hover:text-white"
                        onClick={() => handleBoostChange(f._id, boostInputs[f._id] ?? f.boostWeight ?? 1.0)}
                        loading={actionLoading === f._id}
                        disabled={boostInputs[f._id] === undefined || boostInputs[f._id] === f.boostWeight}
                      >
                        Apply
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-lg border-destructive/30 text-destructive/60 hover:text-white hover:bg-destructive hover:border-destructive transition-all"
                      onClick={() => handleDeleteField(f._id)}
                      loading={actionLoading === f._id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-muted/10 border-t border-border">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest text-center">
              {filteredFields.length} Fields Total
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

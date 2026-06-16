'use client';

/**
 * @file page.tsx (onboarding)
 * @description User onboarding: username, optional bio, avatar, and 5 priority fields.
 */

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Camera } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { UserAvatar } from '../../../components/user/UserAvatar';
import { fetchWithAuth } from '../../../lib/api';
import { toast } from 'sonner';

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(d => d.data);

export default function OnboardingPage() {
  const router = useRouter();
  const { user, accessToken, setUser } = useAuthStore();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ 
    username: user?.username || '', 
    bio: user?.bio || '' 
  });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: fieldsData } = useSWR(`${process.env.NEXT_PUBLIC_API_URL}/api/fields`, fetcher);
  const fields = fieldsData?.fields || [];

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const toggleField = (fieldId: string) => {
    setSelectedFields(prev => {
      if (prev.includes(fieldId)) return prev.filter(id => id !== fieldId);
      if (prev.length >= 10) {
        toast.error('You can select a maximum of 10 fields');
        return prev;
      }
      return [...prev, fieldId];
    });
  };

  const handleSubmit = async () => {
    if (selectedFields.length < 2) {
      toast.error('Please select at least 2 fields');
      return;
    }
    if (selectedFields.length > 10) {
      toast.error('Please select no more than 10 fields');
      return;
    }
    
    setLoading(true);
    try {
      if (!accessToken) return;

      // 1. Update basic info (username/bio)
      await fetchWithAuth('/api/auth/complete-onboarding', {
        method: 'POST',
        body: JSON.stringify({
          username: formData.username,
          bio: formData.bio,
          priorityFields: selectedFields
        })
      });

      // 2. Upload avatar if selected
      if (avatar) {
        const formDataAvatar = new FormData();
        formDataAvatar.append('avatar', avatar);
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me/avatar`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formDataAvatar,
        });
      }

      // 3. Final fetch to refresh user data
      const res = await fetchWithAuth('/api/users/me', { method: 'GET' });
      const data = await res.json();
      if (res.ok) {
        setUser(data.data.user);
        router.push('/home');
      } else {
        toast.error('Onboarding completed, but failed to refresh user data.');
        router.push('/home');
      }
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Welcome to SoB</h1>
      
      {step === 1 && (
        <div className="space-y-4 animate-in fade-in">
          <p className="text-sm text-muted-foreground">Setup your profile.</p>
          <div className="flex justify-center" onClick={() => fileRef.current?.click()}>
            <div className="relative cursor-pointer">
              <UserAvatar avatar={avatarPreview || user?.avatar} name={user?.name || 'User'} size="lg" className="w-24 h-24" />
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </div>
          <Input placeholder="Username (3-20 chars)" required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
          <Input placeholder="Bio (optional)" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} />
          <Button onClick={() => formData.username.length >= 3 ? setStep(2) : toast.error('Username too short')} className="w-full">Continue</Button>
        </div>
      )}
      
      {step === 2 && (
        <div className="space-y-4 animate-in fade-in">
          <p className="text-sm text-muted-foreground">Select your interests (2-10 fields):</p>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Selected: {selectedFields.length}</span>
            {selectedFields.length < 2 && <span className="text-[10px] text-destructive animate-pulse">Select at least 2</span>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {fields.map((f: any) => (
              <button 
                key={f._id} 
                onClick={() => toggleField(f._id)}
                className={`p-2 rounded-lg border text-sm ${selectedFields.includes(f._id) ? 'bg-accent text-white border-accent' : 'bg-muted border-border'}`}
              >
                {f.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="w-full" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={handleSubmit} className="w-full" loading={loading}>Complete</Button>
          </div>
        </div>
      )}
    </div>
  );
}

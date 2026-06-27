'use client';

/**
 * @file page.tsx (settings/profile)
 * @description Edit profile: name, username, bio, profile photo.
 */

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Camera, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '../../../../store/authStore';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Label } from '../../../../components/ui/Label';
import { UserAvatar } from '../../../../components/user/UserAvatar';
import ImageCropperModal from '../../../../components/post/ImageCropperModal';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  bio: z.string().max(300, 'Bio cannot exceed 300 characters').optional(),
  dob: z.string().optional(),
});

type ProfileValues = z.infer<typeof profileSchema>;

export default function EditProfilePage() {
  const { user, accessToken, setUser } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [croppingFile, setCroppingFile] = useState<File | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '', bio: user?.bio || '' },
  });

  const onProfileSave = async (values: ProfileValues) => {
    if (!accessToken) return;
    
    // Make DOB mandatory if it's missing
    if (!user?.dob && !values.dob) {
        setProfileStatus('Date of Birth is required.');
        return;
    }

    // Age validation if DOB is being set
    if (values.dob) {
        const dobDate = new Date(values.dob);
        const today = new Date();
        let age = today.getFullYear() - dobDate.getFullYear();
        const m = today.getMonth() - dobDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) age--;
        
        if (age < 13) {
            setProfileStatus('You must be at least 13 years old.');
            return;
        }
    }

    setProfileStatus(null);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (res.ok) { setUser(data.data.user); setProfileStatus('Profile updated successfully!'); }
    else setProfileStatus(data.message || 'Failed to update profile.');
  };

  const uploadAvatar = async (file: File) => {
    if (!accessToken) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      setProfileStatus('Uploading...');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) { 
        setUser(data.data.user); 
        setProfileStatus('Avatar updated successfully!'); 
      }
      else setProfileStatus(data.message || 'Failed to update avatar.');
    } catch {
      setProfileStatus('Failed to update avatar.');
    }
  };

  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;
    if (file.type.startsWith('image/')) {
      setCroppingFile(file);
      setIsCropperOpen(true);
    } else {
      uploadAvatar(file);
    }
  };

  const handleCropComplete = (croppedFile: File) => {
    setIsCropperOpen(false);
    setCroppingFile(null);
    uploadAvatar(croppedFile);
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center gap-3 pt-2">
        <Link href="/settings" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Edit Profile</h1>
      </div>

      {/* Avatar section */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
          <UserAvatar avatar={user?.avatar} name={user?.name || ''} size="lg" className="w-24 h-24 text-2xl" />
          <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-6 h-6 text-white" />
          </div>
        </div>
        <button onClick={() => fileRef.current?.click()} className="text-xs text-accent font-semibold hover:opacity-80 cursor-pointer">
          Change Photo
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={onAvatarChange} className="hidden" />
      </div>

      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        {profileStatus && (
          <div className={`text-sm p-3 rounded-lg border ${profileStatus.includes('success') || profileStatus.includes('updated') ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
            {profileStatus}
          </div>
        )}
        
        {!user?.dob && (
          <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl flex gap-3 text-orange-600 dark:text-orange-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">Please update your Date of Birth. This is required for account verification and app safety features.</p>
          </div>
        )}

        <form onSubmit={profileForm.handleSubmit(onProfileSave)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" {...profileForm.register('name')} error={!!profileForm.formState.errors.name} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              {...profileForm.register('bio')}
              rows={3}
              maxLength={300}
              className="w-full bg-background border border-input rounded-xl p-3 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
            />
          </div>
          {!user?.dob && (
            <div className="space-y-1">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input type="date" id="dob" {...profileForm.register('dob')} />
            </div>
          )}
          <Button type="submit" loading={profileForm.formState.isSubmitting}>Save Changes</Button>
        </form>
      </section>

      {croppingFile && (
        <ImageCropperModal
          file={croppingFile}
          isOpen={isCropperOpen}
          onClose={() => {
            setIsCropperOpen(false);
            setCroppingFile(null);
          }}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}


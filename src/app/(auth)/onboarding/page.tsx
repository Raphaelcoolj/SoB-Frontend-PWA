'use client';

/**
 * @file page.tsx (onboarding)
 * @description User onboarding: username, optional bio, avatar, and 5 priority fields.
 */

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Camera, Star, Pencil, ChevronDown, Calendar, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { UserAvatar } from '../../../components/user/UserAvatar';
import { fetchWithAuth } from '../../../lib/api';
import { toast } from 'sonner';
import Link from 'next/link';
import ImageCropperModal from '../../../components/post/ImageCropperModal';

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(d => d.data);

const FIELD_EMOJIS: Record<string, string> = {
  math: '🔢', science: '🔬', technology: '💻', engineering: '⚙️',
  art: '🎨', music: '🎵', literature: '📚', history: '📜',
  philosophy: '🧠', psychology: '🧠', biology: '🧬', chemistry: '🧪',
  physics: '⚛️', astronomy: '🔭', geography: '🌍', economics: '📊',
  politics: '🏛️', sociology: '👥', medicine: '🏥', sports: '⚽',
  business: '💼', design: '🎯', photography: '📷', cooking: '🍳',
  languages: '🗣️', education: '📖', environment: '🌿', law: '⚖️',
  finance: '💰', marketing: '📈', coding: '👨‍💻', data: '📉',
  ai: '🤖', robotics: '🤖', gaming: '🎮', film: '🎬',
  fashion: '👗', architecture: '🏗️', anthropology: '🏺',
};

const getFieldEmoji = (name: string): string => {
  const key = name.toLowerCase().trim();
  if (FIELD_EMOJIS[key]) return FIELD_EMOJIS[key];
  for (const [k, emoji] of Object.entries(FIELD_EMOJIS)) {
    if (key.includes(k)) return emoji;
  }
  return '📌';
};

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, accessToken, setUser } = useAuthStore();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ 
    username: user?.username || '', 
    bio: user?.bio || '',
    dobDay: '',
    dobMonth: '',
    dobYear: ''
  });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [croppingFile, setCroppingFile] = useState<File | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: fieldsData } = useSWR(`${process.env.NEXT_PUBLIC_API_URL}/api/fields`, fetcher);
  const fields = fieldsData?.fields || [];

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setCroppingFile(file);
        setIsCropperOpen(true);
      } else {
        setAvatar(file);
        setAvatarPreview(URL.createObjectURL(file));
      }
    }
  };

  const handleCropComplete = (croppedFile: File) => {
    setIsCropperOpen(false);
    setCroppingFile(null);
    setAvatar(croppedFile);
    setAvatarPreview(URL.createObjectURL(croppedFile));
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
    if (!user?.agreedToTerms && !agreeToTerms) {
      toast.error('You must agree to the Terms of Service and Privacy Policy');
      return;
    }
    if (selectedFields.length < 2) {
      toast.error('Please select at least 2 fields');
      return;
    }
    if (selectedFields.length > 10) {
      toast.error('Please select no more than 10 fields');
      return;
    }
    
    // Construct DOB
    let dob = null;
    if (formData.dobDay && formData.dobMonth && formData.dobYear) {
      const monthIndex = MONTHS.indexOf(formData.dobMonth);
      dob = new Date(parseInt(formData.dobYear), monthIndex, parseInt(formData.dobDay));
      if (isNaN(dob.getTime())) {
        toast.error('Invalid Date of Birth');
        return;
      }
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      if (age < 13) {
        toast.error('You must be at least 13 years old to join SoB');
        return;
      }
    }

    setLoading(true);
    try {
      if (!accessToken) return;

      // 1. Update basic info (username/bio/dob)
      await fetchWithAuth('/api/auth/complete-onboarding', {
        method: 'POST',
        body: JSON.stringify({
          username: formData.username,
          bio: formData.bio,
          dob: dob ? dob.toISOString() : undefined,
          priorityFields: selectedFields,
          agreedToTerms: !user?.agreedToTerms ? agreeToTerms : undefined
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

  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Visual Progress Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
            {step === 1 ? 'Setup Profile' : step === 2 ? 'Date of Birth' : 'Choose Topics'}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Step {step} of 3 • {step === 1 ? 'Tell us about yourself' : step === 2 ? 'Security & verification' : 'Personalize your feed'}
          </p>
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === s 
                  ? 'w-6 bg-accent' 
                  : step > s 
                    ? 'w-2 bg-accent/50' 
                    : 'w-2 bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-3">
            <div 
              className="relative cursor-pointer group" 
              onClick={() => fileRef.current?.click()}
              aria-label="Upload profile picture"
            >
              {/* Glowing decorative ring */}
              <div className="absolute -inset-1 bg-gradient-to-tr from-accent to-blue-500 rounded-full blur opacity-30 group-hover:opacity-65 transition duration-300" />
              
              {/* Main Avatar container */}
              <div className="relative rounded-full border-2 border-background overflow-hidden bg-muted flex items-center justify-center transition-transform duration-300 active:scale-95">
                <UserAvatar 
                  avatar={avatarPreview || user?.avatar} 
                  name={user?.name || 'User'} 
                  size="lg" 
                  className="w-24 h-24 sm:w-28 sm:h-28" 
                />
                
                {/* Dark overlay on hover */}
                <div className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Camera className="w-7 h-7 text-white" />
                </div>
              </div>

              {/* Edit/Camera icon floating badge at bottom right */}
              <div className="absolute bottom-1 right-1 bg-accent border-2 border-background w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110">
                <Pencil className="w-4 h-4 text-white" />
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            <p className="text-[11px] text-muted-foreground">Click to upload photo</p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Username</Label>
              <Input 
                id="username"
                placeholder="@username" 
                required 
                value={formData.username} 
                onChange={e => setFormData({...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})} 
              />
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="bio" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bio (optional)</Label>
                <span className="text-[10px] text-muted-foreground">{formData.bio.length}/160</span>
              </div>
              <textarea 
                id="bio"
                placeholder="Tell the world about yourself..." 
                maxLength={160}
                rows={3}
                value={formData.bio} 
                onChange={e => setFormData({...formData, bio: e.target.value})} 
                className="flex w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button 
              onClick={() => formData.username.length >= 3 ? setStep(2) : toast.error('Username must be at least 3 characters')} 
              className="w-full h-12 flex items-center justify-center gap-2 group text-sm font-semibold"
            >
              Continue
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col items-center text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-accent shadow-inner">
              <Calendar className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">When is your birthday?</h2>
              <p className="text-xs text-muted-foreground max-w-[280px]">
                This helps us customize your learning path and verify your age. You must be at least 13.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Month select */}
            <div className="relative">
              <select 
                aria-label="Birth month"
                className="appearance-none bg-card border border-input rounded-xl pl-4 pr-8 py-2.5 text-sm w-full text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all cursor-pointer" 
                value={formData.dobMonth} 
                onChange={e => setFormData({...formData, dobMonth: e.target.value})}
              >
                <option value="">Month</option>
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>

            {/* Day select */}
            <div className="relative">
              <select 
                aria-label="Birth day"
                className="appearance-none bg-card border border-input rounded-xl pl-4 pr-8 py-2.5 text-sm w-full text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all cursor-pointer" 
                value={formData.dobDay} 
                onChange={e => setFormData({...formData, dobDay: e.target.value})}
              >
                <option value="">Day</option>
                {days.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>

            {/* Year select */}
            <div className="relative">
              <select 
                aria-label="Birth year"
                className="appearance-none bg-card border border-input rounded-xl pl-4 pr-8 py-2.5 text-sm w-full text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all cursor-pointer" 
                value={formData.dobYear} 
                onChange={e => setFormData({...formData, dobYear: e.target.value})}
              >
                <option value="">Year</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              className="w-full h-12 text-sm font-semibold flex items-center justify-center gap-1.5" 
              onClick={() => setStep(1)}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <Button 
              className="w-full h-12 text-sm font-semibold" 
              onClick={() => {
                if (formData.dobDay && formData.dobMonth && formData.dobYear) {
                  // Verify age
                  const monthIndex = MONTHS.indexOf(formData.dobMonth);
                  const dob = new Date(parseInt(formData.dobYear), monthIndex, parseInt(formData.dobDay));
                  if (isNaN(dob.getTime())) {
                    toast.error('Invalid Date of Birth');
                    return;
                  }
                  const today = new Date();
                  let age = today.getFullYear() - dob.getFullYear();
                  const m = today.getMonth() - dob.getMonth();
                  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
                  if (age < 13) {
                    toast.error('You must be at least 13 years old to join SoB');
                    return;
                  }
                  setStep(3);
                } else {
                  toast.error('Please select full date');
                }
              }}
            >
              Continue
            </Button>
          </div>
        </div>
      )}
      
      {step === 3 && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="text-center space-y-1 py-1">
            <p className="text-xs text-muted-foreground">Select topics to personalize your dashboard</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs font-semibold text-foreground/80">{selectedFields.length} selected</span>
              {selectedFields.length < 2 && <span className="text-[10px] text-destructive">(min 2)</span>}
              {selectedFields.length >= 2 && <span className="text-[10px] text-emerald-500">✓ Ready to explore</span>}
            </div>
          </div>

          {fields.length === 0 ? (
            <div className="grid grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-12 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1 py-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              {fields.map((f: any) => {
                const isSelected = selectedFields.includes(f._id);
                return (
                  <button
                    key={f._id}
                    onClick={() => toggleField(f._id)}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border text-sm font-semibold transition-all duration-200 cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'bg-accent text-white border-accent shadow-md shadow-accent/25 scale-[1.02]'
                        : 'bg-card border-border/80 text-foreground/80 hover:border-accent/40 hover:bg-muted/30'
                    }`}
                  >
                    <span className="text-base leading-none">{getFieldEmoji(f.name)}</span>
                    <span className="truncate">{f.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {!user?.agreedToTerms && (
            <div className="flex items-start gap-2.5 pt-2 pb-1 text-left">
              <input
                id="agreeToTerms"
                type="checkbox"
                required
                checked={agreeToTerms}
                onChange={e => setAgreeToTerms(e.target.checked)}
                className="w-4 h-4 rounded border-input bg-card text-accent focus:ring-accent/40 cursor-pointer mt-0.5"
              />
              <label htmlFor="agreeToTerms" className="text-xs text-muted-foreground select-none cursor-pointer leading-relaxed">
                I agree to the{' '}
                <Link href="/terms-of-service" target="_blank" className="text-accent font-semibold hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy-policy" target="_blank" className="text-accent font-semibold hover:underline">
                  Privacy Policy
                </Link>
              </label>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              className="w-full h-12 text-sm font-semibold flex items-center justify-center gap-1.5" 
              onClick={() => setStep(2)}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <Button 
              onClick={handleSubmit} 
              className="w-full h-12 text-sm font-semibold" 
              loading={loading} 
              disabled={(!user?.agreedToTerms && !agreeToTerms) || selectedFields.length < 2}
            >
              Complete
            </Button>
          </div>
        </div>
      )}

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

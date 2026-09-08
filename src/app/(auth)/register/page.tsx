'use client';

/**
 * @file page.tsx (register)
 * @description Multi-step user registration page with a visual progress indicator.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { PasswordInput } from '../../../components/ui/PasswordInput';
import { fetchWithAuth } from '../../../lib/api';
import { track } from '../../../lib/analytics';
import { toast } from 'sonner';

const STEPS = ['Account', 'Password'];

export default function RegisterPage() {
  const router = useRouter();
  const { setPending } = useAuthStore();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Guard against a duplicate submission (e.g. Enter-key replay while the
    // first register request is still in flight).
    if (loading) return;
    if (!agreeToTerms) {
      toast.error('You must agree to the Terms of Service and Privacy Policy');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password
        })
      });
      const data = await res.json();
      if (res.ok) {
        // Account is NOT created in the DB yet — a pending signup exists until
        // onboarding is completed. Hold the pending token for the verify-email
        // and onboarding screens.
        const { pendingToken, pendingProfile } = data.data;
        track({ event: 'signup_started', properties: { method: 'email' } });
        setPending(pendingToken, pendingProfile);
        toast.success('Registration successful! Please check your email (and spam folder) for the verification code.');
        router.push('/verify-email');
      } else {
        track({ event: 'signup_failed', properties: { method: 'email', reason: 'rejected' } });
        toast.error(data.message || 'Registration failed');
      }
    } catch {
      track({ event: 'signup_failed', properties: { method: 'email', reason: 'error' } });
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="px-6 sm:px-0 py-6">
      <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-center text-foreground">Create Account</h1>
      <p className="text-sm text-muted-foreground text-center mt-1 mb-6">Join the SoB community</p>
      
      {/* Visual Progress Thread */}
      <div className="flex gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1 flex flex-col items-center gap-1">
            <div className={`h-1.5 w-full rounded-full transition-colors duration-300 ${step >= i + 1 ? 'bg-accent' : 'bg-muted'}`} />
            <span className={`text-[10px] font-medium uppercase ${step >= i + 1 ? 'text-accent' : 'text-muted-foreground'}`}>{s}</span>
          </div>
        ))}
      </div>
      
      <div>
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <Input placeholder="Full Name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            <Input type="email" placeholder="Email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            <Button className="w-full" onClick={() => formData.name && formData.email ? setStep(2) : toast.error('Please fill in all fields')}>Continue</Button>
          </div>
        )}
        
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-300">
            <PasswordInput placeholder="Password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            <PasswordInput placeholder="Confirm Password" required value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
            
            <div className="flex items-start gap-2 pt-2 pb-1">
              <input
                id="agreeToTerms"
                type="checkbox"
                required
                checked={agreeToTerms}
                onChange={e => setAgreeToTerms(e.target.checked)}
                className="w-4 h-4 rounded border-border bg-muted text-accent focus:ring-accent cursor-pointer mt-0.5"
              />
              <label htmlFor="agreeToTerms" className="text-xs text-muted-foreground select-none cursor-pointer leading-relaxed">
                I agree to the{' '}
                <Link href="/terms-of-service" target="_blank" className="text-blue-600 dark:text-accent font-semibold hover:underline">
                  Terms of Service
                </Link>
                ,{' '}
                <Link href="/privacy-policy" target="_blank" className="text-blue-600 dark:text-accent font-semibold hover:underline">
                  Privacy Policy
                </Link>
                , and{' '}
                <Link href="/community-guidelines" target="_blank" className="text-blue-600 dark:text-accent font-semibold hover:underline">
                  Community Guidelines
                </Link>
              </label>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="w-full" type="button" onClick={() => setStep(1)}>Back</Button>
              <Button type="submit" className="w-full" loading={loading} disabled={!agreeToTerms}>Register</Button>
            </div>
          </form>
        )}
      </div>

      <p className="text-sm text-muted-foreground text-center mt-8">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-600 dark:text-accent font-semibold hover:opacity-80">
          Log In
        </Link>
      </p>
    </div>
  );
}

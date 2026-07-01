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
import { Label } from '../../../components/ui/Label';
import { fetchWithAuth } from '../../../lib/api';
import { toast } from 'sonner';

const STEPS = ['Account', 'Username', 'Password'];

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ 
    name: '', 
    username: '', 
    email: '', 
    password: '', 
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const res = await fetchWithAuth('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          username: formData.username,
          email: formData.email,
          password: formData.password
        })
      });
      const data = await res.json();
      if (res.ok) {
        const { user: userData, accessToken: token, refreshToken: rt } = data.data;
        setAuth(userData, token, rt);
        if (rt) localStorage.setItem('sob-refresh-token', rt);
        toast.success('Registration successful! Please check your email (and spam folder) for the verification code.');
        router.push('/verify-email');
      } else {
        toast.error(data.message || 'Registration failed');
      }
    } catch (err) {
      toast.error('An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="px-6 sm:px-0 py-6">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center text-foreground">Create Account</h1>
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
          <div className="space-y-4 animate-in fade-in duration-300">
            <Input placeholder="Username (3-20 chars)" required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
            <div className="flex gap-2">
              <Button variant="outline" className="w-full" onClick={() => setStep(1)}>Back</Button>
              <Button className="w-full" onClick={() => formData.username ? setStep(3) : toast.error('Username required')}>Continue</Button>
            </div>
          </div>
        )}
        
        {step === 3 && (
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
              <Button variant="outline" className="w-full" type="button" onClick={() => setStep(2)}>Back</Button>
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

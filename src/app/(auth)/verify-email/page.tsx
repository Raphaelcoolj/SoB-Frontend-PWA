'use client';

/**
 * @file page.tsx (verify-email)
 * @description Email verification page with 5-digit code input.
 */

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { fetchWithAuth } from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function VerifyEmailPage() {
  const router = useRouter();
  const { pendingToken } = useAuthStore();
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const authHeaders = pendingToken
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${pendingToken}` }
    : undefined;

  const handleDigitChange = (value: string, index: number) => {
    if (value && !/^\d$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    if (value && index < 4) inputRefs.current[index + 1]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length !== 5) {
      toast.error('Please enter the 5-digit code');
      return;
    }

    setLoading(true);
    try {
      const res = pendingToken
        ? await fetch(`${API_URL}/api/auth/verify-email`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ code }),
          })
        : await fetchWithAuth('/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ code }) });
      const data = await res.json();
      if (res.ok) {
        toast.success('Email verified successfully!');
        router.push('/onboarding');
      } else {
        toast.error(data.message || 'Invalid verification code');
      }
    } catch {
      toast.error('An error occurred during verification');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = pendingToken
        ? await fetch(`${API_URL}/api/auth/resend-verification`, {
            method: 'POST',
            headers: authHeaders,
          })
        : await fetchWithAuth('/api/auth/resend-verification', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success('A new verification code has been sent to your email.');
      } else {
        toast.error(data.message || 'Failed to resend code');
      }
    } catch {
      toast.error('An error occurred while resending the code');
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-center">
      <h1 className="text-2xl font-semibold text-foreground">Verify Email</h1>
      <p className="text-sm text-muted-foreground">Enter the 5-digit code sent to your email.</p>
      
      <div className="flex gap-2 justify-center">
        {digits.map((digit, i) => (
          <Input 
            key={i} 
            className="w-12 h-12 text-center text-xl font-medium" 
            maxLength={1} 
            value={digit}
            ref={(el) => { inputRefs.current[i] = el; }}
            onChange={(e) => handleDigitChange(e.target.value, i)}
          />
        ))}
      </div>
      
      <Button type="submit" className="w-full" loading={loading}>Verify</Button>
      <button
        type="button"
        onClick={handleResend}
        disabled={resending}
        className="w-full text-xs text-muted-foreground hover:text-accent transition-colors disabled:opacity-50"
      >
        {resending ? 'Sending...' : "Didn't get a code? Resend"}
      </button>
    </form>
  );
}

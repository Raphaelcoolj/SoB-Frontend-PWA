'use client';

/**
 * @file page.tsx (reset-password)
 * @description Reset Password screen.
 * Gathers the 5-digit email code alongside new password choices.
 * Validates match constraints with Zod and triggers the reset-password API.
 */

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../../../hooks/useAuth';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/ui/Card';

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters long'),
  confirmPassword: z.string().min(6, 'Confirm password is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords must match',
  path: ['confirmPassword'],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const { resetPassword, loading, error: authError } = useAuth();
  
  // Digit collector state for the 5-digit reset code
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [codeError, setCodeError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const handleDigitChange = (value: string, index: number) => {
    if (value && !/^\d$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    setCodeError(null);

    // Auto-advance
    if (value && index < 4) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
      setCodeError(null);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (!/^\d{5}$/.test(pasted)) return;

    setDigits(pasted.split(''));
    inputRefs.current[4]?.focus();
    setCodeError(null);
  };

  const onSubmit = async (values: ResetPasswordFormValues) => {
    const code = digits.join('');
    if (code.length !== 5) {
      setCodeError('Please enter the full 5-digit reset code.');
      return;
    }

    const result = await resetPassword({
      code,
      newPassword: values.newPassword,
    });

    if (result.success) {
      router.push('/login');
    }
  };

  const isCodeComplete = digits.every((d) => d !== '');

  return (
    <Card className="backdrop-blur-md bg-card/90 shadow-2xl border-border/80">
      <CardHeader className="text-center space-y-1">
        <CardTitle className="text-3xl font-extrabold tracking-tight">New Password</CardTitle>
        <CardDescription>Enter your recovery code and choose a new password</CardDescription>
      </CardHeader>
      <CardContent>
        {authError && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg mb-4 text-center font-medium border border-destructive/20 animate-shake">
            {authError}
          </div>
        )}

        {codeError && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg mb-4 text-center font-medium border border-destructive/20">
            {codeError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-center block">5-Digit Recovery Code</Label>
            <div className="flex justify-center gap-3">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength={1}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={digit}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  onChange={(e) => handleDigitChange(e.target.value, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="w-10 h-12 text-center text-xl font-medium bg-muted border border-input focus:border-accent focus:ring-2 focus:ring-accent/40 rounded-lg outline-none transition-all duration-150"
                />
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="••••••••"
              error={!!errors.newPassword}
              {...register('newPassword')}
            />
            {errors.newPassword && <p className="text-xs text-destructive mt-0.5">{errors.newPassword.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              error={!!errors.confirmPassword}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive mt-0.5">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full mt-2" disabled={!isCodeComplete} loading={loading}>
            Save Password
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center border-t border-border/40 py-4">
        <p className="text-sm text-muted-foreground">
          Cancel and return to{' '}
          <Link href="/login" className="text-accent font-semibold hover:opacity-80">
            Log In
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}


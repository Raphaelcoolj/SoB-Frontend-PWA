'use client';

/**
 * @file page.tsx (forgot-password)
 * @description Forgot Password screen.
 * Gathers user email, triggers the password reset API, and navigates to the reset code screen.
 */

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../../../hooks/useAuth';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import Card, { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/ui/Card';
import { toast } from 'sonner';

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { forgotPassword, loading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    const result = await forgotPassword(values.email);
    if (result.success) {
      toast.success('Reset code sent! Please check your email (and spam folder).');
      router.push('/reset-password');
    }
  };

  return (
    <Card className="backdrop-blur-md bg-card/90 shadow-2xl border-border/80 w-full max-w-md">
      <CardHeader className="text-center space-y-1">
        <CardTitle className="text-2xl font-semibold">Recover Password</CardTitle>
        <CardDescription>Enter your email to receive a recovery code</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="alex@example.com"
              error={!!errors.email}
              {...register('email')}
            />
            {errors.email && <p className="text-xs text-destructive mt-0.5">{errors.email.message}</p>}
          </div>

          <Button type="submit" className="w-full mt-2" loading={loading}>
            Send Recovery Code
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center border-t border-border/40 py-4">
        <p className="text-sm text-muted-foreground">
          Remember your password?{' '}
          <Link href="/login" className="text-accent font-semibold hover:opacity-80">
            Log In
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

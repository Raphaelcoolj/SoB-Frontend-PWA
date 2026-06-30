'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../../../hooks/useAuth';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { PasswordInput } from '../../../components/ui/PasswordInput';
import { Label } from '../../../components/ui/Label';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error: authError } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    const result = await login({
      email: values.email,
      password: values.password,
    });

    if (result.success && result.user) {
      if (result.user.isOnboarded) {
        router.push('/home');
      } else {
        router.push('/onboarding');
      }
    } else {
       toast.error(authError || 'Invalid email or password');
    }
  };

  const handleGoogleOAuth = () => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    window.location.href = `${apiBase}/api/auth/google`;
  };

  return (
    <div className="px-6 sm:px-0 py-6">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center text-foreground">Welcome Back</h1>
      <p className="text-sm text-muted-foreground text-center mt-1 mb-8">Log in to access your SoB account</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="email">Email or Username</Label>
          <Input
            id="email"
            type="text"
            placeholder="alex@example.com or @username"
            error={!!errors.email}
            {...register('email')}
          />
          {errors.email && <p className="text-xs text-destructive mt-0.5">{errors.email.message}</p>}
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-accent font-semibold hover:opacity-80"
            >
              Forgot Password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            placeholder="••••••••"
            error={!!errors.password}
            {...register('password')}
          />
          {errors.password && <p className="text-xs text-destructive mt-0.5">{errors.password.message}</p>}
        </div>

        <Button type="submit" className="w-full mt-2" loading={loading}>
          Log In
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background sm:bg-card px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full flex items-center justify-center gap-2 hover:bg-muted/80"
        onClick={handleGoogleOAuth}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Google
      </Button>

      <p className="text-sm text-muted-foreground text-center mt-8">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-accent font-semibold hover:opacity-80">
          Sign Up
        </Link>
      </p>
    </div>
  );
}

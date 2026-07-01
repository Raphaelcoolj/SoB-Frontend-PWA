'use client';

/**
 * @file TermsAgreementModal.tsx
 * @description Sleek, premium non-dismissible modal overlay that forces logged-in
 * users who have not agreed to the Terms of Service / Privacy Policy to accept them.
 */

import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useAuth } from '../../hooks/useAuth';
import { fetchWithAuth } from '../../lib/api';
import { Button } from '../ui/Button';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/Card';

export default function TermsAgreementModal() {
  const { user, setUser } = useAuthStore();
  const { logout } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Only render if user is logged in but hasn't agreed to the terms
  if (!user || user.agreedToTerms) {
    return null;
  }

  const handleSubmit = async () => {
    if (!agreed) return;
    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify({ agreedToTerms: true })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.data.user);
        toast.success('Thank you! You have agreed to the updated terms.');
      } else {
        toast.error(data.message || 'Failed to update agreement status.');
      }
    } catch (err) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
      <Card className="w-full max-w-lg bg-card border border-border shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl font-extrabold tracking-tight">Terms & Privacy Update</CardTitle>
          <CardDescription>
            We've updated our Terms of Service and Privacy Policy. Please review and accept them to continue using SoB.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="overflow-y-auto flex-1 space-y-4 pr-2 text-sm leading-relaxed scrollbar-thin">
          <div className="space-y-3 bg-muted/40 p-4 rounded-xl border border-border/40">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xs mt-0.5">1</div>
              <div>
                <h4 className="font-semibold text-foreground">Age Requirement</h4>
                <p className="text-muted-foreground text-xs">You must be at least 13 years old to create an account and join the community.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xs mt-0.5">2</div>
              <div>
                <h4 className="font-semibold text-foreground">Your Content & Conduct</h4>
                <p className="text-muted-foreground text-xs">You own the posts/comments you submit. However, you grant SoB a license to display it. Harassment or spam is strictly prohibited.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xs mt-0.5">3</div>
              <div>
                <h4 className="font-semibold text-foreground">Privacy & Data</h4>
                <p className="text-muted-foreground text-xs">We protect your profile settings and usage history. We do not sell your personal data to third parties.</p>
              </div>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Please read the full{' '}
            <Link href="/terms-of-service" target="_blank" className="text-accent hover:underline font-semibold">
              Terms of Service
            </Link>
            ,{' '}
            <Link href="/privacy-policy" target="_blank" className="text-accent hover:underline font-semibold">
              Privacy Policy
            </Link>
            , and{' '}
            <Link href="/community-guidelines" target="_blank" className="text-accent hover:underline font-semibold">
              Community Guidelines
            </Link>{' '}
            for detailed information on our guidelines and how we handle data.
          </p>

          <div className="flex items-start gap-2 pt-2 border-t border-border/40">
            <input
              id="modal-agree-checkbox"
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="w-4 h-4 rounded border-border bg-muted text-accent focus:ring-accent cursor-pointer mt-0.5"
            />
            <label htmlFor="modal-agree-checkbox" className="text-xs font-medium text-muted-foreground select-none cursor-pointer leading-normal">
              I agree to the Terms of Service and Privacy Policy.
            </label>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-border/40">
          <Button 
            className="w-full sm:order-2" 
            disabled={!agreed} 
            loading={isSubmitting} 
            onClick={handleSubmit}
          >
            Agree & Continue
          </Button>
          <Button 
            variant="outline" 
            className="w-full sm:order-1 text-muted-foreground hover:text-foreground" 
            onClick={logout}
          >
            Log Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

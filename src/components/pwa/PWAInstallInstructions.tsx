'use client';

/**
 * @file PWAInstallInstructions.tsx
 * @description Polished instructional sheet for installing SoB on iOS Safari
 * via Share → Add to Home Screen. Opened from the install banner; closes on
 * Escape, the close button, or "Got it".
 */

import React, { useEffect, useRef } from 'react';
import { X, Share, SquarePlus, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';

interface PWAInstallInstructionsProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    icon: Share,
    title: 'Tap the Share button',
    detail: 'at the bottom of the Safari toolbar',
  },
  {
    icon: SquarePlus,
    title: 'Select Add to Home Screen',
    detail: 'from the share sheet',
  },
  {
    icon: Check,
    title: 'Tap Add',
    detail: 'in the top-right corner',
  },
];

export default function PWAInstallInstructions({ open, onClose }: PWAInstallInstructionsProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Move focus into the dialog (to the close control) so keyboard + screen
    // reader users land somewhere predictable. Focus is not trapped.
    closeButtonRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-instructions-title"
    >
      <Card className="relative w-full max-w-md bg-card border border-border shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close install instructions"
        >
          <X className="w-4 h-4" />
        </button>

        <CardHeader className="pt-6 pr-12">
          <div className="flex items-center gap-3">
            <img
              src="/android-chrome-192x192.png"
              alt="SoB"
              className="w-10 h-10 rounded-xl shrink-0"
            />
            <CardTitle id="pwa-install-instructions-title" className="text-xl leading-tight">
              Install SoB on your iPhone
            </CardTitle>
          </div>
          <CardDescription>
            SoB works best as an app. Add it to your Home Screen in three quick steps.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="flex items-center gap-3 bg-muted/40 rounded-xl border border-border/40 p-3"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    <span className="text-accent font-bold mr-1.5">{index + 1}.</span>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>
                </div>
              </div>
            );
          })}
        </CardContent>

        <CardFooter className="pt-4">
          <Button className="w-full" onClick={onClose}>
            Got it
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

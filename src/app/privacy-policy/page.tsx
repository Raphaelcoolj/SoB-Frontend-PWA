/**
 * @file page.tsx (privacy-policy)
 * @description Static privacy policy page.
 */

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../../components/shared/Logo';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background p-6 lg:p-20">
      <div className="max-w-3xl mx-auto space-y-10">
        <header className="flex items-center justify-between">
          <Logo />
          <Link href="/home" className="text-xs font-medium text-muted-foreground hover:text-accent flex items-center gap-2 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </header>

        <main className="prose prose-invert max-w-none space-y-6">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground italic">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: June 12, 2026</p>
          
          <section className="space-y-4 pt-4">
            <h2 className="text-xl font-medium text-foreground">1. Introduction</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Welcome to SoB (Sphere of Brilliance). We value your privacy and are committed to protecting your personal data. 
              This policy explains how we collect, use, and safeguard your information.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-foreground">2. Data Collection</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              [Insert Privacy Policy here]
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-foreground">3. How We Use Data</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We use your data to provide and improve our services, personalize your experience, and communicate with you.
            </p>
          </section>
        </main>

        <footer className="pt-10 border-t border-border">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest text-center">
            &copy; 2026 Sphere of Brilliance
          </p>
        </footer>
      </div>
    </div>
  );
}


/**
 * @file page.tsx (terms-of-service)
 * @description Static terms of service page.
 */

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../../components/shared/Logo';

export default function TermsOfServicePage() {
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
          <h1 className="text-4xl font-semibold tracking-tight text-foreground italic">Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: June 12, 2026</p>
          
          <section className="space-y-4 pt-4">
            <h2 className="text-xl font-medium text-foreground">1. Agreement to Terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              By accessing or using SoB, you agree to be bound by these Terms of Service. 
              If you do not agree, please do not use our platform.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-foreground">2. User Content</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              [Insert Terms of Service here]
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-foreground">3. Prohibited Conduct</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Users are prohibited from posting illegal, harmful, or copyright-infringing content. 
              We reserve the right to remove any content at our discretion.
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


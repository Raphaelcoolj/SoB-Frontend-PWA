/**
 * @file page.tsx (privacy-policy)
 * @description Static privacy policy page displaying the platform's privacy policy content.
 */

import React from 'react';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../../components/shared/Logo';

export default function PrivacyPolicyPage() {
  let htmlContent = '';
  try {
    const htmlPath = path.join(process.cwd(), 'src/app/privacy-policy/policy_content.html');
    htmlContent = fs.readFileSync(htmlPath, 'utf8');
  } catch (err) {
    console.error('Failed to load privacy policy content:', err);
    htmlContent = '<p>Privacy policy content is temporarily unavailable.</p>';
  }

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

        <main className="privacy-policy-container prose prose-invert max-w-none text-foreground">
          <style>{`
            .privacy-policy-container [data-custom-class='title'], 
            .privacy-policy-container [data-custom-class='title'] * {
              color: var(--color-foreground) !important;
              font-family: inherit !important;
            }
            .privacy-policy-container [data-custom-class='heading_1'], 
            .privacy-policy-container [data-custom-class='heading_1'] * {
              color: var(--color-foreground) !important;
              font-family: inherit !important;
            }
            .privacy-policy-container [data-custom-class='heading_2'], 
            .privacy-policy-container [data-custom-class='heading_2'] * {
              color: var(--color-foreground) !important;
              font-family: inherit !important;
            }
            .privacy-policy-container [data-custom-class='body_text'], 
            .privacy-policy-container [data-custom-class='body_text'] * {
              color: var(--color-foreground) !important;
              opacity: 0.85;
              font-family: inherit !important;
            }
            .privacy-policy-container [data-custom-class='subtitle'], 
            .privacy-policy-container [data-custom-class='subtitle'] * {
              color: var(--color-foreground) !important;
              opacity: 0.7;
              font-family: inherit !important;
            }
            .privacy-policy-container [data-custom-class='link'], 
            .privacy-policy-container [data-custom-class='link'] * {
              color: var(--color-accent, #3b82f6) !important;
              font-family: inherit !important;
              text-decoration: underline;
            }
          `}</style>
          <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
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

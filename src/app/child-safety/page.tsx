import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, AlertTriangle, Mail } from 'lucide-react';
import { Logo } from '../../components/shared/Logo';

export default function ChildSafetyPage() {
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

        <main className="max-w-none space-y-8 text-muted-foreground leading-relaxed text-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground italic">Child Safety</h1>
              <p className="text-xs text-muted-foreground">Last updated: June 30, 2026</p>
            </div>
          </div>

          <section className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Zero Tolerance Policy
            </h2>
            <p>
              SoB has a <strong>zero-tolerance policy</strong> against Child Sexual Abuse and Exploitation (CSAE). 
              Any content, behavior, or activity that exploits, abuses, or endangers children is strictly prohibited on our platform.
            </p>
            <p>
              This includes but is not limited to: child sexual abuse material (CSAM), grooming, inappropriate communication 
              with minors, and any content that sexualizes minors.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-foreground">Our Commitments</h2>
            <div className="space-y-3">
              {[
                {
                  title: 'Proactive Detection and Removal',
                  desc: 'We use automated moderation tools to detect and remove CSAE content. Any detected content is immediately removed and reported.',
                },
                {
                  title: 'Reporting to Authorities',
                  desc: 'We report all confirmed CSAE content to the National Center for Missing & Exploited Children (NCMEC) and relevant law enforcement agencies, in compliance with applicable laws.',
                },
                {
                  title: 'User Reporting',
                  desc: 'Users can report suspected CSAE content or behavior using our in-app reporting feature or by contacting us directly. All reports are treated with the highest priority.',
                },
                {
                  title: 'Age Protection',
                  desc: 'SoB requires all users to be at least 13 years old. Accounts found to be operated by individuals under 13 will be terminated. We employ age screening measures and restrict sensitive content from minors.',
                },
                {
                  title: 'Cooperation with Law Enforcement',
                  desc: 'We fully cooperate with law enforcement agencies investigating child safety matters and maintain records as required by law.',
                },
              ].map((item, i) => (
                <div key={i} className="p-4 bg-card border border-border rounded-xl space-y-1">
                  <h3 className="font-semibold text-foreground text-sm">{item.title}</h3>
                  <p className="text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-foreground">How to Report Child Safety Concerns</h2>
            <div className="p-4 bg-card border border-border rounded-xl space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-accent">1</span>
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">In-App Reporting</p>
                  <p className="text-xs text-muted-foreground">Use the Report feature on any post or user profile to flag concerning content. Select the appropriate reason category.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-accent">2</span>
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">Contact Us Directly</p>
                  <p className="text-xs text-muted-foreground">Email us at <a href="mailto:spherebrilliq@gmail.com" className="text-accent hover:underline font-medium">spherebrilliq@gmail.com</a> with details of your concern. We treat all child safety reports as urgent.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-accent">3</span>
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">Contact NCMEC Directly</p>
                  <p className="text-xs text-muted-foreground">You can also report directly to the National Center for Missing & Exploited Children at <a href="https://report.cybertip.org" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-medium">report.cybertip.org</a> or call 1-800-THE-LOST.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-foreground">Child Safety Contact</h2>
            <div className="p-4 bg-card border border-border rounded-xl flex items-start gap-3">
              <Mail className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-foreground font-medium">Designated Child Safety Point of Contact</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ekeh O. Chukwuemeka<br />
                  Email: <a href="mailto:spherebrilliq@gmail.com" className="text-accent hover:underline">spherebrilliq@gmail.com</a><br />
                  SoB — Sphere of Brilliance
                </p>
              </div>
            </div>
          </section>

          <section className="bg-muted/30 border border-border rounded-2xl p-6 text-xs space-y-2">
            <p className="text-foreground font-semibold">Legal Compliance</p>
            <p>SoB complies with all applicable child safety laws and regulations, including the U.S. Children&apos;s Online Privacy Protection Act (COPPA), the U.K. Age Appropriate Design Code, and relevant international standards for online child protection.</p>
            <p className="pt-2">
              This page is publicly available and serves as our published Child Safety Standards resource as required by Google Play&apos;s Developer Program Policies for Social apps.
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

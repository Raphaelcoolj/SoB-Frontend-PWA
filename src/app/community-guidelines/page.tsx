import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../../components/shared/Logo';

export default function CommunityGuidelinesPage() {
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

        <main className="prose prose-invert max-w-none space-y-8 text-muted-foreground leading-relaxed text-sm">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground italic">Community Guidelines</h1>
          <p className="text-xs text-muted-foreground">Last updated: June 30, 2026</p>

          <section className="space-y-4 pt-4">
            <h2 className="text-xl font-medium text-foreground">Our Commitment</h2>
            <p>
              SoB is a platform for educational and meaningful social interaction. We are committed to maintaining a respectful, safe, and constructive environment for all users. These guidelines apply to all content and behavior on the platform.
            </p>
            <p>
              Violations of these guidelines may result in content removal, account suspension, or permanent bans. Serious violations, especially those involving child safety, will be reported to law enforcement.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-foreground">1. Be Respectful</h2>
            <p>Treat others with respect and courtesy. Harassment, bullying, intimidation, or hateful behavior of any kind is not tolerated.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-foreground">2. No Hate Speech</h2>
            <p>We do not allow content that promotes violence, incites hatred, or discriminates against individuals or groups based on race, ethnicity, religion, disability, gender, sexual orientation, or any other protected characteristic.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-foreground">3. No Violence or Harmful Content</h2>
            <p>Do not post content that depicts or promotes violence, self-harm, terrorism, or dangerous activities. This includes threats against individuals or groups.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-foreground">4. No Sexual Content</h2>
            <p>Pornography, sexually explicit material, and sexually predatory behavior are strictly prohibited. Content that is sexually suggestive must be marked as sensitive.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-foreground">5. Protect Minors</h2>
            <p>Child sexual abuse and exploitation (CSAE) material is absolutely prohibited. Any content or behavior that endangers children will be reported to the National Center for Missing & Exploited Children (NCMEC) and law enforcement. Users must be at least 13 years old to use SoB.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-foreground">6. No Spam or Deceptive Content</h2>
            <p>Do not spam, impersonate others, distribute misleading information, or engage in deceptive practices.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-foreground">7. Respect Privacy</h2>
            <p>Do not share others' personal or private information without their consent. This includes addresses, phone numbers, financial details, and intimate images.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-foreground">8. Reporting Violations</h2>
            <p>If you see content or behavior that violates these guidelines, please report it using the in-app report feature or contact us at spherebrilliq@gmail.com. We review all reports and take appropriate action.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-foreground">9. Enforcement</h2>
            <p>Violations are reviewed on a case-by-case basis. Consequences may include content removal, content flagging as sensitive, temporary suspension, or permanent account termination. Egregious violations, especially those involving child safety, will be reported to relevant authorities.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-foreground">10. Contact</h2>
            <p>For questions about these guidelines, please contact us at <a href="mailto:spherebrilliq@gmail.com" className="text-accent hover:underline">spherebrilliq@gmail.com</a>.</p>
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

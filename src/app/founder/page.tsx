import Link from 'next/link';
import { AtSign, ExternalLink, Globe, User } from 'lucide-react';
import { Logo } from '../../components/shared/Logo';
import {
  FOUNDER_NAME,
  FOUNDER_ROLE,
  FOUNDER_PAGE,
  ORGANIZATION_ID,
  PERSON_ID,
  ORG_NAME,
  SITE_URL,
  FOUNDER_LINKEDIN,
  FOUNDER_X,
  SOB_LINKEDIN,
} from '../../lib/site';

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': PERSON_ID,
    name: FOUNDER_NAME,
    url: FOUNDER_PAGE,
    jobTitle: FOUNDER_ROLE,
    description:
      'Ekeh Oghenerurie Chukwuemeka is the founder and creator of SoB (SphereBrilliq) and serves as its Lead Developer.',
    sameAs: [FOUNDER_LINKEDIN, FOUNDER_X],
    worksFor: { '@id': ORGANIZATION_ID },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: FOUNDER_PAGE,
    mainEntity: { '@id': PERSON_ID },
  },
];

const profileLinks = [
  {
    label: 'LinkedIn',
    href: FOUNDER_LINKEDIN,
    description: 'Personal profile',
    icon: AtSign,
  },
  {
    label: 'X',
    href: FOUNDER_X,
    description: 'Personal profile',
    icon: AtSign,
  },
  {
    label: 'SoB — official LinkedIn',
    href: SOB_LINKEDIN,
    description: 'SoB (SphereBrilliq) company page',
    icon: ExternalLink,
  },
  {
    label: 'Website',
    href: SITE_URL,
    description: 'spherebrilliq.online',
    icon: Globe,
  },
];

export default function FounderPage() {
  const jsonLdString = JSON.stringify(jsonLd).replace(/</g, '\\u003c');

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-x-hidden bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString }} />

      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-md will-change-transform">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:text-foreground"
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <User className="h-8 w-8" aria-hidden />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{FOUNDER_NAME}</h1>
            <p className="mt-2 text-base font-medium text-muted-foreground">
              {FOUNDER_ROLE} of SoB
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-8">
          <section aria-labelledby="founder-bio">
            <h2 id="founder-bio" className="text-lg font-semibold tracking-tight">
              Biography
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {FOUNDER_NAME} is a software engineer and technology builder, and the founder and
              creator of SoB (SphereBrilliq). He leads the technical development of SoB and has
              designed and built its core web platform and supporting systems.
            </p>
          </section>

          <section aria-labelledby="founder-sob">
            <h2 id="founder-sob" className="text-lg font-semibold tracking-tight">
              Relationship to SoB
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {FOUNDER_NAME} is the founder and creator of SoB. He designed and developed the core
              platform and serves as its Lead Developer, continuing to lead its technical
              development.
            </p>
          </section>

          <section aria-labelledby="founder-spherebrilliq">
            <h2 id="founder-spherebrilliq" className="text-lg font-semibold tracking-tight">
              Relationship to SphereBrilliq
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {ORG_NAME} was founded and is independently operated by {FOUNDER_NAME}. {ORG_NAME}{' '}
              develops and operates SoB at spherebrilliq.online.
            </p>
          </section>

          <section
            aria-labelledby="founder-profiles"
            className="rounded-2xl border border-border bg-card/50 p-5"
          >
            <h2 id="founder-profiles" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Globe className="h-5 w-5 text-accent" aria-hidden />
              Official profiles
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              The founder&apos;s personal profiles, and the official SoB profiles.
            </p>
            <ul className="mt-4 space-y-3">
              {profileLinks.map((profile) => {
                const Icon = profile.icon ?? Globe;
                return (
                  <li key={profile.href} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <a
                        href={profile.href}
                        rel="noopener noreferrer"
                        target="_blank"
                        className="block truncate text-sm font-medium text-accent hover:underline focus-visible:outline-none focus-visible:underline"
                      >
                        {profile.label}
                      </a>
                      <span className="block text-xs text-muted-foreground">
                        {profile.description}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="founder-sob-links" className="pt-1">
            <h2 id="founder-sob-links" className="text-lg font-semibold tracking-tight">
              SoB
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              SoB is a social platform for discovering topics, sharing posts and articles, exploring
              ideas, and participating in discussions. It is developed and operated by{' '}
              {ORG_NAME}.{' '}
              <Link href="/" className="font-medium text-accent hover:underline">
                Visit SoB
              </Link>
              .
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Built and operated by SphereBrilliq.</p>
          <nav className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Footer">
            <Link href="/about" className="transition-colors hover:text-foreground">
              About
            </Link>
            <Link href="/founder" className="transition-colors hover:text-foreground">
              Founder
            </Link>
            <Link href="/contact" className="transition-colors hover:text-foreground">
              Contact
            </Link>
            <Link href="/terms-of-service" className="transition-colors hover:text-foreground">
              Terms of Use
            </Link>
            <Link href="/privacy-policy" className="transition-colors hover:text-foreground">
              Privacy Policy
            </Link>
          </nav>
        </div>
        <div className="border-t border-border/70 py-3 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} SoB · spherebrilliq.online
        </div>
      </footer>
    </div>
  );
}

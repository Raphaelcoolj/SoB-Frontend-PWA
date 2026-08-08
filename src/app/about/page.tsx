import Link from 'next/link';
import { Compass, ExternalLink, Globe, Heart, MessageSquare, PenLine, Share2, Users } from 'lucide-react';
import { Logo } from '../../components/shared/Logo';
import {
  ORGANIZATION_ID,
  WEBSITE_ID,
  SITE_URL,
  ORG_NAME,
  LOGO_URL,
  PERSON_ID,
  FOUNDER_NAME,
  FOUNDER_PAGE,
  FOUNDER_LINKEDIN,
  FOUNDER_X,
  SOB_LINKEDIN,
} from '../../lib/site';

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: ORG_NAME,
    url: SITE_URL,
    logo: LOGO_URL,
    description:
      'SphereBrilliq was founded and is independently operated by Ekeh Oghenerurie Chukwuemeka. SphereBrilliq develops and operates SoB, a social platform for discovering ideas, sharing content, and participating in discussions.',
    founder: { '@id': PERSON_ID },
    sameAs: [SOB_LINKEDIN],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: 'SoB',
    alternateName: 'SphereBrilliq SoB',
    url: SITE_URL,
    publisher: { '@id': ORGANIZATION_ID },
    inLanguage: 'en',
  },
];

const activities = [
  {
    icon: Compass,
    label: 'Discover topics',
    description: 'Explore fields and trending conversations across the platform.',
  },
  {
    icon: PenLine,
    label: 'Publish',
    description: 'Share your ideas through posts and long-form articles.',
  },
  {
    icon: Users,
    label: 'Follow',
    description: 'Follow people and the topics you care about.',
  },
  {
    icon: MessageSquare,
    label: 'Discuss',
    description: 'Comment on posts and join meaningful discussions.',
  },
  {
    icon: Heart,
    label: 'Engage',
    description: 'Like and bookmark the ideas you enjoy.',
  },
  {
    icon: Share2,
    label: 'Share',
    description: 'Share content across SoB.',
  },
];

const founderProfiles = [
  { label: 'LinkedIn', href: FOUNDER_LINKEDIN, description: 'Personal profile' },
  { label: 'X', href: FOUNDER_X, description: 'Personal profile' },
];

const sobProfiles = [
  { label: 'Official LinkedIn', href: SOB_LINKEDIN, description: 'SoB (SphereBrilliq)' },
  { label: 'Website', href: SITE_URL, description: 'spherebrilliq.online' },
];

export default function AboutPage() {
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
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">About SoB</h1>

        <div className="mt-8 space-y-8">
          <section aria-labelledby="about-sob">
            <h2 id="about-sob" className="text-lg font-semibold tracking-tight">
              SoB
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              SoB is a social platform for discovering topics, sharing posts and articles, exploring
              ideas, and participating in discussions. Users can explore interests, discover
              content, follow people, publish posts, and participate in conversations.
            </p>
          </section>

          <section aria-labelledby="about-spherebrilliq">
            <h2 id="about-spherebrilliq" className="text-lg font-semibold tracking-tight">
              SphereBrilliq
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              SphereBrilliq is the organization/project behind SoB. SphereBrilliq develops and
              operates SoB.
            </p>
          </section>

          <section aria-labelledby="about-founder">
            <h2 id="about-founder" className="text-lg font-semibold tracking-tight">
              Founder
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {FOUNDER_NAME} is the founder and creator of SoB and serves as its Lead Developer. He
              designed and developed the core platform and continues to lead its technical
              development.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link
                href={FOUNDER_PAGE}
                className="text-sm font-medium text-accent hover:underline focus-visible:outline-none focus-visible:underline"
              >
                Learn more about the founder
              </Link>
              {founderProfiles.map((profile) => (
                <a
                  key={profile.href}
                  href={profile.href}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="text-sm font-medium text-accent hover:underline focus-visible:outline-none focus-visible:underline"
                >
                  {profile.label}
                  <span className="sr-only"> ({profile.description})</span>
                </a>
              ))}
            </div>
          </section>

          <section
            aria-labelledby="about-relationship"
            className="rounded-2xl border border-border bg-card/50 p-5"
          >
            <h2 id="about-relationship" className="text-lg font-semibold tracking-tight">
              The relationship
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              <strong className="font-semibold text-foreground">SoB is operated by SphereBrilliq.</strong>{' '}
              SphereBrilliq was founded and is independently operated by {FOUNDER_NAME}. SoB is the
              social platform; SphereBrilliq is the organization/project that builds, runs and
              maintains it.
            </p>
          </section>

          <section aria-labelledby="about-profiles">
            <h2 id="about-profiles" className="text-lg font-semibold tracking-tight">
              Official profiles
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-card/50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <ExternalLink className="h-4 w-4 text-accent" aria-hidden />
                  Founder
                </p>
                <ul className="mt-2 space-y-1.5">
                  {founderProfiles.map((profile) => (
                    <li key={profile.href} className="text-sm">
                      <a
                        href={profile.href}
                        rel="noopener noreferrer"
                        target="_blank"
                        className="font-medium text-accent hover:underline focus-visible:outline-none focus-visible:underline"
                      >
                        {profile.label}
                      </a>
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        ({profile.description})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-border bg-card/50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Globe className="h-4 w-4 text-accent" aria-hidden />
                  SoB
                </p>
                <ul className="mt-2 space-y-1.5">
                  {sobProfiles.map((profile) => (
                    <li key={profile.href} className="text-sm">
                      <a
                        href={profile.href}
                        rel="noopener noreferrer"
                        target="_blank"
                        className="font-medium text-accent hover:underline focus-visible:outline-none focus-visible:underline"
                      >
                        {profile.label}
                      </a>
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        ({profile.description})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section aria-labelledby="about-activities">
            <h2 id="about-activities" className="text-lg font-semibold tracking-tight">
              What you can do on SoB
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              SoB today supports discovering topics and fields, publishing posts and long-form
              articles, sharing content, following people and topics, liking and bookmarking,
              commenting, and joining discussions.
            </p>
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {activities.map((activity) => {
                const Icon = activity.icon;
                return (
                  <li
                    key={activity.label}
                    className="flex items-start gap-3 rounded-xl border border-border bg-card/50 p-4"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{activity.label}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {activity.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="about-contact" className="pt-2">
            <h2 id="about-contact" className="text-lg font-semibold tracking-tight">
              Contact
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Questions or feedback? Reach out through the{' '}
              <Link href="/contact" className="font-medium text-accent hover:underline">
                contact page
              </Link>{' '}
              or email{' '}
              <a href="mailto:spherebrilliq@gmail.com" className="font-medium text-accent hover:underline">
                spherebrilliq@gmail.com
              </a>
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
            <Link href="/privacy-policy" className="transition-colors hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="transition-colors hover:text-foreground">
              Terms of Use
            </Link>
            <Link href="/community-guidelines" className="transition-colors hover:text-foreground">
              Community Guidelines
            </Link>
            <Link href="/contact" className="transition-colors hover:text-foreground">
              Contact
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

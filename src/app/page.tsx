import type { Metadata } from 'next';
import Link from 'next/link';
import { Compass, MessageSquare, PenLine, Users } from 'lucide-react';
import { Logo } from '../components/shared/Logo';
import HomepageShowcase from '../components/home/HomepageShowcase';
import type { HomepageData } from '../types/homepage';

// ISR: re-render the landing page (and re-fetch the live homepage aggregate)
// every 60s so real SoB content ships in the initial HTML for SEO. The fetch
// below carries the same revalidate so a failure is caught and the page still
// renders with graceful unavailable states instead of failing the build.
export const revalidate = 60;

const EMPTY_HOMEPAGE: HomepageData = { posts: [], topics: [], discussions: [], users: [] };

async function fetchHomepageServer(): Promise<{ data: HomepageData; serverFailed: boolean }> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return { data: EMPTY_HOMEPAGE, serverFailed: true };
  try {
    const res = await fetch(`${apiUrl}/api/homepage`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { data: EMPTY_HOMEPAGE, serverFailed: true };
    const data = (json?.data as HomepageData) ?? EMPTY_HOMEPAGE;
    return { data, serverFailed: false };
  } catch {
    return { data: EMPTY_HOMEPAGE, serverFailed: true };
  }
}

export const metadata: Metadata = {
  title: { absolute: 'SoB — Connect, Discover & Share | SphereBrilliq' },
  description: 'SoB is a social platform operated by SphereBrilliq where people discover topics, publish and share posts and articles, and participate in discussions.',
  keywords: ['sob', 'SoB', 'SOB', 'SphereBrilliq', 'spherebrilliq.online', 'social platform'],
  openGraph: {
    type: 'website',
    url: 'https://spherebrilliq.online',
    siteName: 'SoB',
    title: 'SoB — Connect, Discover & Share | SphereBrilliq',
    description: 'SoB is a social platform operated by SphereBrilliq where people discover topics, publish and share posts and articles, and participate in discussions.',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SoB — Connect, Discover & Share | SphereBrilliq',
    description: 'SoB is a social platform operated by SphereBrilliq where people discover topics, publish and share posts and articles, and participate in discussions.',
  },
  alternates: {
    canonical: 'https://spherebrilliq.online',
  },
};

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://spherebrilliq.online/#organization',
    name: 'SphereBrilliq',
    url: 'https://spherebrilliq.online',
    logo: 'https://spherebrilliq.online/android-chrome-512x512.png',
    description:
      'SphereBrilliq operates SoB, a social platform for discovering ideas, sharing content, and participating in discussions.',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://spherebrilliq.online/#website',
    name: 'SoB',
    alternateName: 'SphereBrilliq SoB',
    url: 'https://spherebrilliq.online',
    publisher: { '@id': 'https://spherebrilliq.online/#organization' },
    inLanguage: 'en',
  },
];

const features = [
  {
    icon: PenLine,
    title: 'Publish',
    description: 'Share your ideas through posts, stories and long-form articles.',
  },
  {
    icon: Compass,
    title: 'Discover',
    description: 'Explore conversations across a wide range of fields.',
  },
  {
    icon: MessageSquare,
    title: 'Discuss',
    description: 'Join meaningful discussions under every post.',
  },
  {
    icon: Users,
    title: 'Connect',
    description: "Follow people and topics you're interested in.",
  },
];

const footerLinks = [
  { label: 'About', href: '/about' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms of Use', href: '/terms-of-service' },
  { label: 'Community Guidelines', href: '/community-guidelines' },
  { label: 'Child Safety', href: '/child-safety' },
  { label: 'Contact', href: '/contact' },
];

export default async function RootPage() {
  const jsonLdString = JSON.stringify(jsonLd).replace(/</g, '\\u003c');
  const { data: initialHomepage, serverFailed } = await fetchHomepageServer();

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-x-hidden bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString }} />

      {/* Ambient background — subtle grid + soft blue glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(70% 45% at 50% 0%, rgba(59,130,246,0.12), transparent 60%)',
          }}
        />
        <div
          className="absolute -top-40 -right-28 h-80 w-80 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.20), transparent 70%)' }}
        />
        <div
          className="absolute -left-40 bottom-0 h-96 w-96 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.14), transparent 70%)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(90% 70% at 50% 0%, #000, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(90% 70% at 50% 0%, #000, transparent 75%)',
          }}
        />
      </div>

      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-md will-change-transform">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-2 sm:gap-3" aria-label="Account">
            <Link
              href="/login"
              className="inline-flex min-h-[44px] items-center px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus:rounded-xl"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="inline-flex min-h-[44px] items-center rounded-xl bg-accent px-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-accent/90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-5"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center">
        {/* Hero + CTA */}
        <section className="w-full max-w-5xl px-4 pt-10 text-center sm:px-6 sm:pt-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            The platform for ideas
          </span>

          <h1 className="mt-5 text-[clamp(2.5rem,9vw,4.75rem)] font-bold leading-[1.05] tracking-tight">
            Where ideas become <span className="italic">conversations.</span>
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-lg">
            SoB is a social platform operated by SphereBrilliq where people discover topics, publish
            and share posts and articles, and participate in meaningful discussions.
          </p>

          <div className="mx-auto mt-8 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:items-center sm:justify-center">
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-8 text-base font-semibold text-white shadow-[0_8px_24px_-8px_rgba(59,130,246,0.55)] transition-all duration-200 hover:bg-accent/90 hover:shadow-[0_8px_28px_-6px_rgba(59,130,246,0.6)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Join SoB
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-background px-8 text-base font-medium text-foreground transition-colors duration-200 hover:border-accent/40 hover:bg-accent/5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Sign in
            </Link>
          </div>
        </section>

        {/* Live product showcase — real SoB content */}
        <HomepageShowcase initialData={initialHomepage} serverFailed={serverFailed} />

        {/* Feature highlights */}
        <section className="w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16" aria-label="What you can do on SoB">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-border bg-card/50 p-5 text-left transition-colors duration-200 hover:border-accent/30 hover:bg-card/80"
                >
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/12 text-accent">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h2 className="text-base font-semibold tracking-tight">{feature.title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-2">
              <Logo />
              <p className="text-sm text-muted-foreground">
                SoB — a social platform at spherebrilliq.online.
              </p>
            </div>
            <nav className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm" aria-label="Legal">
              {footerLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="mt-8 pt-4 text-center text-xs text-muted-foreground border-t border-border/70 sm:text-left">
            &copy; {new Date().getFullYear()} SoB · spherebrilliq.online
          </div>
        </div>
      </footer>
    </div>
  );
}
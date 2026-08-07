import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '../components/shared/Logo';

export const metadata: Metadata = {
  title: { absolute: 'SoB — Connect, Discover & Share' },
  description: 'SoB is a social platform for discovering ideas, sharing knowledge, connecting with people, and exploring topics that interest you.',
  keywords: ['SoB', 'SphereBrilliq', 'spherebrilliq.online', 'social platform'],
  openGraph: {
    type: 'website',
    url: 'https://spherebrilliq.online',
    siteName: 'SoB',
    title: 'SoB — Connect, Discover & Share',
    description: 'SoB is a social platform for discovering ideas, sharing knowledge, connecting with people, and exploring topics that interest you.',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SoB — Connect, Discover & Share',
    description: 'SoB is a social platform for discovering ideas, sharing knowledge, connecting with people, and exploring topics that interest you.',
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
    alternateName: 'SoB',
    url: 'https://spherebrilliq.online',
    logo: 'https://spherebrilliq.online/android-chrome-512x512.png',
    foundingLocation: 'spherebrilliq.online',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://spherebrilliq.online/#website',
    name: 'SoB',
    alternateName: 'SphereBrilliq',
    url: 'https://spherebrilliq.online',
    publisher: { '@id': 'https://spherebrilliq.online/#organization' },
    inLanguage: 'en',
  },
];

export default async function RootPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const searchParams = await props.searchParams;

  if (searchParams.token && searchParams.refreshToken) {
    const isOnboarded = searchParams.isOnboarded || 'false';
    redirect(
      `/oauth-callback?token=${searchParams.token}&refreshToken=${searchParams.refreshToken}&isOnboarded=${isOnboarded}`
    );
  }

  const jsonLdString = JSON.stringify(jsonLd).replace(/</g, '\\u003c');

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString }} />
      <header className="w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground px-4 py-2 rounded-full transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="text-sm font-medium bg-accent text-white px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity"
          >
            Get started
          </Link>
        </nav>
      </header>

      <main className="w-full max-w-5xl mx-auto px-6 flex-1 flex flex-col items-center justify-center text-center gap-8 py-16">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Welcome to <span className="italic">SoB</span>
        </h1>
        <p className="max-w-2xl text-base md:text-lg text-muted-foreground leading-relaxed">
          <strong className="text-foreground">SoB</strong> is the name of the platform, operated at{' '}
          <strong className="text-foreground">spherebrilliq.online</strong>. Create an account, publish long-form
          articles, stories and short-form posts across a wide range of fields — education, science, technology,
          philosophy, sports, music, movies, literature and more — and join the debate under every post.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-full bg-accent text-white px-7 py-3 font-medium hover:opacity-90 transition-opacity"
          >
            Join SphereBrilliq
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full border border-border px-7 py-3 font-medium text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-colors"
          >
            Sign in
          </Link>
        </div>
        <nav className="pt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link className="hover:text-foreground transition-colors" href="/privacy-policy">
            Privacy Policy
          </Link>
          <Link className="hover:text-foreground transition-colors" href="/terms-of-service">
            Terms of Use
          </Link>
          <Link className="hover:text-foreground transition-colors" href="/community-guidelines">
            Community Guidelines
          </Link>
          <Link className="hover:text-foreground transition-colors" href="/child-safety">
            Child Safety
          </Link>
          <Link className="hover:text-foreground transition-colors" href="/contact">
            Contact
          </Link>
        </nav>
      </main>

      <footer className="w-full border-t border-border/40 py-6 text-center text-sm text-muted-foreground">
        <p>
          &copy; {new Date().getFullYear()} SphereBrilliq · spherebrilliq.online · SoB
        </p>
      </footer>
    </div>
  );
}
import Link from 'next/link';
import { Compass, Heart, MessageSquare, PenLine, Share2, Users } from 'lucide-react';
import { Logo } from '../../components/shared/Logo';

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

export default function AboutPage() {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-x-hidden bg-background text-foreground">
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
              SoB is a social platform where people discover topics, publish and share posts and
              articles, and participate in discussions. It is a place for ideas and the
              conversations that grow around them.
            </p>
          </section>

          <section aria-labelledby="about-spherebrilliq">
            <h2 id="about-spherebrilliq" className="text-lg font-semibold tracking-tight">
              SphereBrilliq
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              SphereBrilliq is the operator behind SoB. It runs and maintains the platform at
              spherebrilliq.online.
            </p>
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
              SoB is the social platform; SphereBrilliq is the company that builds, runs and
              maintains it.
            </p>
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
          <p>&copy; {new Date().getFullYear()} SoB · spherebrilliq.online</p>
          <nav className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Legal">
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
      </footer>
    </div>
  );
}

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV || 'production',

  // Capture 100% of traces in dev, 10% in production
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],

  // Capture Replay for 10% of all sessions, plus 100% of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  beforeSend(event) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Sentry] Event captured:', event.exception?.values?.[0]?.value);
    }
    return event;
  },
});

// Instruments App Router navigations as transactions
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

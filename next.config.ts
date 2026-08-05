import { withSerwist } from "@serwist/turbopack";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts', 'framer-motion'],
  },
};

export default withSentryConfig(withSerwist(nextConfig), {
  // Provide via SENTRY_ORG / SENTRY_PROJECT env vars (e.g. CI/CD); optional for local dev
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,
});

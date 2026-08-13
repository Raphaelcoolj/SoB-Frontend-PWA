import { withSerwist } from "@serwist/turbopack";
import { withSentryConfig } from "@sentry/nextjs";

const isProd = process.env.NODE_ENV === "production";

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com https://*.mux.com platform-data:",
  "font-src 'self' data:",
  `connect-src 'self' blob: https://api.spherebrilliq.online wss://api.spherebrilliq.online https://sob-backend-api.onrender.com wss://sob-backend-api.onrender.com https://res.cloudinary.com https://*.mux.com${isProd ? "" : " http://localhost:5000 ws://localhost:5000"}`,
  "media-src 'self' blob: https://*.mux.com https://res.cloudinary.com platform-data:",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
];

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspDirectives.join("; ") },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "geolocation=(), payment=(), usb=(), serial=(), magnetometer=(), gyroscope=(), accelerometer=(), ambient-light-sensor=(), idle-detection=(), screen-wake-lock=(), window-management=()",
  },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload",
        },
      ]
    : []),
];

const privateCacheControl = { key: "Cache-Control", value: "private, no-store" };

const privateRoutes = [
  "/home",
  "/explore",
  "/topics",
  "/leaderboard",
  "/preferences",
  "/notifications",
  "/bookmarks",
  "/create",
  "/search",
  "/chats/:path*",
  "/settings/:path*",
  "/profile/:path*",
  "/post/:path*",
  "/admin/:path*",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/onboarding",
  "/oauth-callback",
  "/delete-account",
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {},
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts', 'framer-motion'],
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      ...privateRoutes.map((source) => ({ source, headers: [privateCacheControl] })),
    ];
  },
};

export default withSentryConfig(withSerwist(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
});

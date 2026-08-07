import type { MetadataRoute } from 'next';

const SITE_URL = 'https://spherebrilliq.online';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/settings',
        '/chats',
        '/search',
        '/notifications',
        '/bookmarks',
        '/create',
        '/post',
        '/profile',
        '/login',
        '/register',
        '/forgot-password',
        '/reset-password',
        '/verify-email',
        '/onboarding',
        '/oauth-callback',
        '/delete-account',
        '/offline',
        '/serwist/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
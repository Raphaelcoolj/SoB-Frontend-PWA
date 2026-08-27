import { NextResponse } from 'next/server';

/**
 * Serves `/.well-known/apple-app-site-association` for iOS Universal Links.
 *
 * The content is inlined (not read from disk) so it works reliably on
 * serverless platforms like Netlify where `process.cwd()` may not resolve
 * to the expected build directory.
 */

const AASA_CONTENT = JSON.stringify(
  {
    applinks: {
      apps: [],
      details: [
        {
          appID: 'TEAM_ID.com.sob.app', // TODO: Replace TEAM_ID with your Apple Developer Team ID
          paths: [
            '/post/*',
            '/profile/*',
            '/digest/*',
            '/chats',
            '/chats/*',
            '/home',
            '/search',
            '/create',
            '/bookmarks',
            '/notifications',
            '/oauth-callback',
          ],
        },
      ],
    },
    webcredentials: {
      apps: [],
    },
  },
  null,
  2,
);

export async function GET() {
  return new NextResponse(AASA_CONTENT, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600, must-revalidate',
    },
  });
}

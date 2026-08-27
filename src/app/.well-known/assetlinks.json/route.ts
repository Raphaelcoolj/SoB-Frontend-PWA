import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Serves `/.well-known/assetlinks.json` for Android App Links verification.
 *
 * Next.js public/ files are normally served statically, but the Netlify Next.js
 * plugin can miss dot-prefixed directories. This route handler reads the file
 * directly from `public/` as a reliable fallback.
 */
export async function GET() {
  try {
    const filePath = join(process.cwd(), 'public', '.well-known', 'assetlinks.json');
    const content = await readFile(filePath, 'utf-8');
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, must-revalidate',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  }
}

import { redirect } from 'next/navigation';

/**
 * @file page.tsx (root)
 * @description Landing page — redirects to home.
 */

export default function RootPage() {
  redirect('/home');
}


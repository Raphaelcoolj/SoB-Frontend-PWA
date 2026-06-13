import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/privacy-policy',
  '/terms-of-service',
];

const ADMIN_ROUTES = ['/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  const isPublicRoute = PUBLIC_ROUTES.some(route =>
    pathname.startsWith(route)
  );

  // Get auth token from cookies
  const token = request.cookies.get('sob-auth')?.value;

  let isAuthenticated = false;
  let isAdmin = false;

  if (token) {
    try {
      const parsed = JSON.parse(token);
      isAuthenticated = !!parsed?.state?.accessToken;
      isAdmin = parsed?.state?.user?.role === 'admin';
    } catch {
      isAuthenticated = false;
    }
  }

  // Redirect unauthenticated users to login
  if (!isPublicRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect non-admins away from admin routes
  const isAdminRoute = ADMIN_ROUTES.some(route =>
    pathname.startsWith(route)
  );
  if (isAdminRoute && !isAdmin) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  // Redirect authenticated users away from auth pages
  if (isPublicRoute && isAuthenticated && pathname !== '/privacy-policy' && pathname !== '/terms-of-service') {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icons|assets).*)',
  ],
};

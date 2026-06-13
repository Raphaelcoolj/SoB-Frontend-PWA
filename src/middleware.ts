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
  const tokenCookie = request.cookies.get('sob-auth');
  console.log('Middleware - Path:', pathname, 'Token Cookie Found:', !!tokenCookie);
  const token = tokenCookie?.value;

  let isAuthenticated = false;
  let isAdmin = false;

  if (token) {
    try {
      const parsed = JSON.parse(token);
      console.log('Middleware - Parsed State exists:', !!parsed?.state);
      isAuthenticated = !!parsed?.state?.accessToken;
      isAdmin = parsed?.state?.user?.role === 'admin';
    } catch (e) {
      console.error('Middleware - Cookie Parse Error:', e);
      isAuthenticated = false;
    }
  } else {
    console.log('Middleware - No token cookie found for path:', pathname);
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

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that don't require authentication
const PUBLIC_PATHS: string[] = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/',
  '/api/test',
  '/api/health',
  '/api/status',
  '/admin/login',
  '/admin/dashboard',
];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Check if the path is public
  if (PUBLIC_PATHS.includes(path) || path.startsWith('/api/admin') || path.startsWith('/css') || path.startsWith('/_next')) {
    return NextResponse.next();
  }
  
  // For non-API routes, allow the request to proceed
  // API route auth will be handled by route handlers
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
// Explicitly set Node.js runtime for middleware
export const runtime = "nodejs";

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
  '/api/database-status',  // New database status endpoint
  '/admin/login',
  '/admin',
  '/api/admin/auth/login'  // Make sure admin login endpoint is public
];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Check if the path is public or static file
  // This check is very permissive to prevent blocking any important paths
  if (
    PUBLIC_PATHS.includes(path) || 
    path.startsWith('/api/admin/auth/') ||   // All admin auth endpoints are public
    path.startsWith('/css') || 
    path.startsWith('/_next') ||
    path.startsWith('/public') ||
    path.includes('.') ||                  // Files with extensions (e.g. favicon.ico)
    path.startsWith('/images')
  ) {
    console.log(`[Middleware] Allowing public path: ${path}`);
    return NextResponse.next();
  }

  // For admin dashboard pages, check for auth but don't block
  // The client-side auth will handle redirection to login if needed
  if (path.startsWith('/admin/')) {
    console.log(`[Middleware] Admin path accessed: ${path}`);
    return NextResponse.next();
  }

  // For API routes, we'll let the route handlers handle authentication
  if (path.startsWith('/api/')) {
    console.log(`[Middleware] API path accessed: ${path}`);
    return NextResponse.next();
  }
  
  // Allow all other routes
  console.log(`[Middleware] Other path accessed: ${path}`);
  return NextResponse.next();
}

// Configure the middleware to run on all paths except static assets
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
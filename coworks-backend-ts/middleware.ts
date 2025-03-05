import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

// Paths that don't require authentication
const PUBLIC_PATHS: string[] = [
  '/api/auth/login',
  '/api/auth/register',
  '/',
  '/api/test', 
  '/api/health'
];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Check if the path is public
  if (PUBLIC_PATHS.includes(path)) {
    return NextResponse.next();
  }
  
  // Check if path starts with /api
  if (path.startsWith('/api')) {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new NextResponse(
        JSON.stringify({ message: 'Authentication required' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    
    // Verify token
    try {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || 'your-secret-key'
      );
      
      await jose.jwtVerify(token, secret);
      
      // Token is valid, continue with the request
      return NextResponse.next();
    } catch (error) {
      const err = error as Error;
      const isExpired = err.message.includes('expired');
      
      return new NextResponse(
        JSON.stringify({ message: isExpired ? 'Token expired' : 'Invalid token' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }
  }
  
  // For non-API routes, allow the request to proceed
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: '/api/:path*',
};
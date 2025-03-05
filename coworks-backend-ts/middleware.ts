import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';
import { verifyJWT } from '@/config/jwt-edge';

// Paths that don't require authentication
const PUBLIC_PATHS: string[] = [
  '/api/auth/login',
  '/api/auth/register',
  '/',
  '/api/test', // for testing connection
  '/api/health'
];

// JWT verification for Edge middleware
async function verifyJWT(token: string): Promise<{valid: boolean, expired: boolean}> {
  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'your-secret-key'
    );

    await jose.jwtVerify(token, secret);
    return { valid: true, expired: false };
  } catch (error) {
    const err = error as Error;
    return {
      valid: false,
      expired: err.message.includes('expired')
    };
  }
}

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
    const { valid, expired } = await verifyJWT(token);
    
    if (!valid) {
      return new NextResponse(
        JSON.stringify({ message: expired ? 'Token expired' : 'Invalid token' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }
    
    // Continue with the request
    return NextResponse.next();
  }
  
  // For non-API routes, allow the request to proceed
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: '/api/:path*',
};
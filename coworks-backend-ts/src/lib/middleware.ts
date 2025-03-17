import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/config/jwt';

// List of public routes that don't require authentication
const publicRoutes = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check for auth token
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token) {
    return new NextResponse(
      JSON.stringify({ message: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const verificationResult = await verifyToken(token);
    if (verificationResult.type !== 'valid') {
      return new NextResponse(
        JSON.stringify({ message: 'Invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Token is valid, proceed
    return NextResponse.next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return new NextResponse(
      JSON.stringify({ message: 'Authentication error' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
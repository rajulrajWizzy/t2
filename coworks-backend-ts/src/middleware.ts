// Explicitly set Node.js runtime for middleware
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Add validation helper functions
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateDate(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return dateRegex.test(date);
}

function validateTime(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

function validateShortCode(code: string): boolean {
  const codeRegex = /^[A-Z0-9]{2,10}$/;
  return codeRegex.test(code);
}

function validateSeatCode(code: string): boolean {
  const codeRegex = /^[A-Z0-9]{2,10}-[A-Z0-9]{1,5}$/;
  return codeRegex.test(code);
}

function validateBookingCode(code: string): boolean {
  const codeRegex = /^BK-[A-Z0-9]{6,12}$/;
  return codeRegex.test(code);
}

// Edge-compatible token verification
function verifyTokenFormat(token: string): { valid: boolean; decoded: any } {
  try {
    // In Edge Runtime, we'll just perform basic token structure validation
    // and decode the payload without crypto verification
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, decoded: null };
    }
    
    // Decode the payload (middle part)
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    const decoded = JSON.parse(jsonPayload);
    
    // Basic expiry check
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, decoded: null };
    }
    
    return { valid: true, decoded };
  } catch (error) {
    console.error('Token verification error:', error);
    return { valid: false, decoded: null };
  }
}

// Middleware function to handle token verification and request validation
export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;
    
    // Check if this is an admin route that should be protected
    if (pathname.startsWith('/admin') && 
        !pathname.startsWith('/admin/login')) {
      
      // Check if the admin token exists in cookies
      const adminToken = request.cookies.get('adminToken')?.value;
      
      if (!adminToken) {
        // Redirect to the login page
        const url = new URL('/admin/login', request.url);
        // Store the original URL to redirect back after login
        url.searchParams.set('redirectTo', pathname);
        
        return NextResponse.redirect(url);
      }
      
      // Continue with the request if admin token exists
      return NextResponse.next();
    }
    
    // Skip middleware for non-API routes and auth-related endpoints
    if (!pathname.startsWith('/api/') || 
        pathname.startsWith('/api/auth/') || 
        pathname === '/api/health' ||
        pathname === '/api/database-status' ||
        pathname.includes('/_next/')) {
      return NextResponse.next();
    }

    // Special validation for specific API endpoints
    if (pathname.startsWith('/api/branches/')) {
      // If using branch code in URL, validate it
      const branchCodeMatch = pathname.match(/\/api\/branches\/([^\/]+)/);
      if (branchCodeMatch && branchCodeMatch[1]) {
        const branchCode = branchCodeMatch[1];
        
        // Skip validation if it's a numeric ID
        if (!/^\d+$/.test(branchCode) && !validateShortCode(branchCode)) {
          return NextResponse.json(
            { success: false, message: 'Invalid branch code format', data: null },
            { status: 400 }
          );
        }
      }
    }
    
    if (pathname.startsWith('/api/seats/')) {
      // If using seat code in URL, validate it
      const seatCodeMatch = pathname.match(/\/api\/seats\/([^\/]+)/);
      if (seatCodeMatch && seatCodeMatch[1]) {
        const seatCode = seatCodeMatch[1];
        
        // Skip validation if it's a numeric ID
        if (!/^\d+$/.test(seatCode) && !validateSeatCode(seatCode)) {
          return NextResponse.json(
            { success: false, message: 'Invalid seat code format', data: null },
            { status: 400 }
          );
        }
      }
    }

    // Process query parameters for common validation issues
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    // Validate date parameters
    const dateParam = searchParams.get('date');
    if (dateParam && !validateDate(dateParam)) {
      return NextResponse.json(
        { success: false, message: 'Invalid date format, use YYYY-MM-DD', data: null },
        { status: 400 }
      );
    }
    
    // Validate time parameters
    const startTime = searchParams.get('start_time');
    const endTime = searchParams.get('end_time');
    
    if (startTime && !validateTime(startTime)) {
      return NextResponse.json(
        { success: false, message: 'Invalid start_time format, use HH:MM', data: null },
        { status: 400 }
      );
    }
    
    if (endTime && !validateTime(endTime)) {
      return NextResponse.json(
        { success: false, message: 'Invalid end_time format, use HH:MM', data: null },
        { status: 400 }
      );
    }
    
    // Validate branch and seating type codes in query params
    const branchCode = searchParams.get('branch_code');
    if (branchCode && !validateShortCode(branchCode)) {
      return NextResponse.json(
        { success: false, message: 'Invalid branch_code format', data: null },
        { status: 400 }
      );
    }
    
    const seatingTypeCode = searchParams.get('seating_type_code');
    if (seatingTypeCode && !validateShortCode(seatingTypeCode)) {
      return NextResponse.json(
        { success: false, message: 'Invalid seating_type_code format', data: null },
        { status: 400 }
      );
    }

    // Paths that require token verification - all /api/ routes except auth and public endpoints
    if (pathname.startsWith('/api/') && 
        !pathname.startsWith('/api/auth/') && 
        !pathname.startsWith('/api/public/') && 
        !pathname.startsWith('/api/admin/auth/') &&  // Add exemption for admin auth
        pathname !== '/api/health' &&
        pathname !== '/api/database-status' &&
        !pathname.includes('/_next/')) {
      
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        return NextResponse.json(
          { success: false, message: 'Authorization token is required', data: null },
          { status: 401 }
        );
      }
      
      const token = authHeader.replace('Bearer ', '');
      if (!token) {
        return NextResponse.json(
          { success: false, message: 'Authorization token is required', data: null },
          { status: 401 }
        );
      }
      
      try {
        // Use Edge-compatible token verification
        const { valid, decoded } = verifyTokenFormat(token);
        
        if (!valid || !decoded) {
          return NextResponse.json(
            { success: false, message: 'Authorization token expired or invalid', data: null },
            { status: 401 }
          );
        }
        
        // Validate decoded token
        if (!decoded || typeof decoded !== 'object') {
          return NextResponse.json(
            { success: false, message: 'Invalid token format', data: null },
            { status: 401 }
          );
        }
        
        // Validate auth token claims
        if (!decoded.id || !decoded.email) {
          return NextResponse.json(
            { success: false, message: 'Invalid authorization token', data: null },
            { status: 401 }
          );
        }
        
        // Email validation
        if (!validateEmail(decoded.email as string)) {
          return NextResponse.json(
            { success: false, message: 'Invalid email in authorization token', data: null },
            { status: 401 }
          );
        }
        
        // This passes basic checks, let the route handle full verification
        
      } catch (error) {
        console.error('Token verification error:', error);
        return NextResponse.json(
          { 
            success: false, 
            message: 'Invalid authorization token',
            data: null
          },
          { status: 401 }
        );
      }
    }

    // Check for POST/PUT/PATCH requests to validate request body
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      try {
        // For JSON requests, clone and validate content
        const contentType = request.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          // We'll do basic validation in the route handlers
          // This is just a safeguard against completely malformed requests
          await request.clone().json();
        }
      } catch (error) {
        return NextResponse.json(
          { success: false, message: 'Invalid JSON in request body', data: null },
          { status: 400 }
        );
      }
    }

    // Get the path
    const path = request.nextUrl.pathname;
    
    // Continue with the request if authenticated or it's a public route
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: (error as Error).message },
      { status: 500 }
    );
  }
}

export const config = {
  matcher: [
    '/api/:path*',
    '/admin/:path*'
  ],
}; 
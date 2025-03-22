// Explicitly set Node.js runtime for middleware
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// Only import the verifyToken function, which doesn't use Sequelize
import { verifyToken } from './utils/jwt';

// Add validation helper functions
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateShortCode(code: string): boolean {
  return typeof code === 'string' && code.length >= 3 && code.length <= 10;
}

function validateSeatCode(code: string): boolean {
  // Seat code should match pattern like "HD001" - 2-3 letter code followed by 3 digits
  const seatCodeRegex = /^[A-Z]{2,3}\d{3,4}$/;
  return seatCodeRegex.test(code);
}

function validateDate(date: string): boolean {
  // Check if date is in format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  
  // Check if date is valid
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
}

function validateTime(time: string): boolean {
  // Check if time is in format HH:MM or HH:MM:SS
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
  return timeRegex.test(time);
}

// Middleware function to handle token verification and request validation
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for non-API routes and auth-related endpoints
  if (!pathname.startsWith('/api/') || 
      pathname.startsWith('/api/auth/') || 
      pathname === '/api/health') {
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
          { success: false, message: 'Invalid branch code format' },
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
          { success: false, message: 'Invalid seat code format' },
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
      { success: false, message: 'Invalid date format, use YYYY-MM-DD' },
      { status: 400 }
    );
  }
  
  // Validate time parameters
  const startTime = searchParams.get('start_time');
  const endTime = searchParams.get('end_time');
  
  if (startTime && !validateTime(startTime)) {
    return NextResponse.json(
      { success: false, message: 'Invalid start_time format, use HH:MM' },
      { status: 400 }
    );
  }
  
  if (endTime && !validateTime(endTime)) {
    return NextResponse.json(
      { success: false, message: 'Invalid end_time format, use HH:MM' },
      { status: 400 }
    );
  }
  
  // Validate branch and seating type codes in query params
  const branchCode = searchParams.get('branch_code');
  if (branchCode && !validateShortCode(branchCode)) {
    return NextResponse.json(
      { success: false, message: 'Invalid branch_code format' },
      { status: 400 }
    );
  }
  
  const seatingTypeCode = searchParams.get('seating_type_code');
  if (seatingTypeCode && !validateShortCode(seatingTypeCode)) {
    return NextResponse.json(
      { success: false, message: 'Invalid seating_type_code format' },
      { status: 400 }
    );
  }

  // Paths that require token verification - all /api/ routes except auth and public endpoints
  if (pathname.startsWith('/api/') && 
      !pathname.startsWith('/api/auth/') && 
      !pathname.startsWith('/api/public/') && 
      pathname !== '/api/health') {
    
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authorization token is required' },
        { status: 401 }
      );
    }
    
    try {
      const { valid, decoded } = await verifyToken(token);
      
      if (!valid || !decoded) {
        return NextResponse.json(
          { success: false, message: 'Invalid or expired authorization token' },
          { status: 401 }
        );
      }
      
      // Validate auth token claims
      if (!decoded.id || !decoded.email) {
        return NextResponse.json(
          { success: false, message: 'Invalid authorization token' },
          { status: 401 }
        );
      }
      
      // Email validation
      if (!validateEmail(decoded.email as string)) {
        return NextResponse.json(
          { success: false, message: 'Invalid email in authorization token' },
          { status: 401 }
        );
      }
      
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired authorization token' },
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
        { success: false, message: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
}; 
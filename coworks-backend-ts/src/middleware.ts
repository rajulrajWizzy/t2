import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './utils/jwt';

// Add validation helper functions
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateShortCode(code: string): boolean {
  // More flexible validation for short codes:
  // - Allow lowercase and uppercase letters
  // - Allow digits
  // - Allow underscore and hyphen
  // - Length between 2 and 10 characters
  return typeof code === 'string' && /^[a-zA-Z0-9_-]{2,10}$/.test(code);
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

// Define routes that require specific roles
export const adminRoutes = ['/api/admin'];
export const superAdminRoutes = ['/api/admin/super'];

// Split public routes into string and regex patterns
const publicRouteStrings = [
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/admin/auth/login',
  '/api/setup/database-status',
  '/api/setup/fix-customers-table',
  '/api/status',
  '/api/test',
  '/api/database-status',
  '/api/files', // File serving endpoint
];

const publicRouteRegexes = [
  /^\/api\/files\/.+/, // All file paths
];

// Same but as regex for more complex patterns
export const bypassPatterns = [
  /^\/api\/public\/.*/,     // All public API routes
  /^\/api\/status\/?$/,     // API status endpoint
  /^\/api\/test\/?$/,       // API test endpoint
  /^\/api\/auth\/login\/?$/,            // Login endpoint
  /^\/api\/auth\/register\/?$/,         // Registration endpoint
  /^\/api\/auth\/forgot-password\/?$/,  // Forgot password
  /^\/api\/auth\/reset-password\/?$/,   // Reset password
  /^\/api\/admin\/auth\/login\/?$/,     // Admin login
  /^\/api\/admin\/auth\/forgot-password\/?$/,  // Admin forgot password
  /^\/api\/admin\/auth\/reset-password\/?$/,   // Admin reset password
  /^\/api\/setup\/database-status\/?$/,        // Database status
  /^\/api\/setup\/fix-customers-table\/?$/,    // Fix customers table
  /^\/api\/setup\/env-test\/?$/,               // Environment test
];

// Function to check if a route matches any of the patterns
function matchesRoutePattern(pathname: string, patterns: string[] | RegExp[]): boolean {
  for (const pattern of patterns) {
    if (typeof pattern === 'string') {
      // Exact match
      if (pathname === pattern) {
        return true;
      }
      
      // Pattern with trailing slash
      if (pattern.endsWith('/') && pathname.startsWith(pattern)) {
        return true;
      }
      
      // Pattern without trailing slash - check if it's at start of path
      if (!pattern.endsWith('/') && 
          (pathname.startsWith(pattern + '/') || pathname === pattern)) {
        return true;
      }
    } else if (pattern instanceof RegExp) {
      // Regex pattern
      if (pattern.test(pathname)) {
        return true;
      }
    }
  }
  
  return false;
}

// Middleware function to handle token verification and request validation
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Log the requested path for debugging
  console.log(`[Middleware] Path accessed: ${pathname}`);
  
  // Skip middleware for non-API routes and public endpoints
  if (!pathname.startsWith('/api/') || 
      matchesRoutePattern(pathname, publicRouteStrings) ||
      matchesRoutePattern(pathname, publicRouteRegexes) ||
      matchesRoutePattern(pathname, bypassPatterns)) {
    console.log(`[Middleware] Allowing public path: ${pathname}`);
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

  // Securely extract token from Authorization header
  let authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  
  // Check if header exists and has correct format (case insensitive)
  if (!authHeader || 
     (!authHeader.toLowerCase().startsWith('bearer ') && 
      !authHeader.toLowerCase().startsWith('bearer:'))) {
    return NextResponse.json(
      { success: false, message: 'Invalid authorization header format' },
      { status: 401 }
    );
  }
  
  // Standardize the format regardless of how it was provided
  authHeader = authHeader.replace(/^bearer:?\s*/i, '');
  
  // Ensure token is not empty
  if (!authHeader || authHeader.trim() === '') {
    return NextResponse.json(
      { success: false, message: 'Authorization token is required' },
      { status: 401 }
    );
  }
  
  try {
    const { valid, decoded, role } = await verifyToken(authHeader.trim());
    
<<<<<<< Updated upstream
<<<<<<< Updated upstream
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authorization token is required' },
        { status: 401 }
      );
    }
    
    try {
      const decoded = await verifyToken(token);
      
      // Validate auth token claims
      if (!decoded.id || !decoded.email) {
        return NextResponse.json(
          { success: false, message: 'Invalid authorization token' },
          { status: 401 }
        );
      }
      
      // Email validation
      if (!validateEmail(decoded.email)) {
        return NextResponse.json(
          { success: false, message: 'Invalid email in authorization token' },
          { status: 401 }
        );
      }
      
    } catch (error) {
=======
    if (!valid || !decoded) {
>>>>>>> Stashed changes
=======
    if (!valid || !decoded) {
>>>>>>> Stashed changes
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
    
    // Role-based access control
    if (matchesRoutePattern(pathname, superAdminRoutes) && role !== 'super_admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Super admin access required' },
        { status: 403 }
      );
    }
    
    if (matchesRoutePattern(pathname, adminRoutes) && role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }
    
    // Add user info to request headers for downstream handlers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('X-User-Id', decoded.id.toString());
    requestHeaders.set('X-User-Email', decoded.email as string);
    requestHeaders.set('X-User-Role', role || 'user');
    
    // Continue with updated headers
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Authentication failed', 
        error: (error as Error).message 
      },
      { status: 401 }
    );
  }
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
}; 
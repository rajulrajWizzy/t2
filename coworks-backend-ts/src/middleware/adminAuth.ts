import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/config/jwt';
import { UserRole } from '@/types/auth';

/**
 * Middleware to verify that a user is an admin
 * @param request The incoming request
 * @returns NextResponse with error if not authenticated as admin, or null to continue
 */
export async function verifyAdminToken(request: NextRequest): Promise<NextResponse | null> {
  try {
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - No token provided'
      }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded, expired, blacklisted } = await verifyToken(token);
    
    if (!valid) {
      let message = 'Unauthorized - Invalid token';
      if (expired) message = 'Unauthorized - Token expired';
      if (blacklisted) message = 'Unauthorized - Token revoked';
      
      return NextResponse.json({
        success: false,
        message
      }, { status: 401 });
    }
    
    // Check if user is admin
    if (!decoded || (decoded.role !== UserRole.BRANCH_ADMIN && decoded.role !== UserRole.SUPER_ADMIN)) {
      return NextResponse.json({
        success: false,
        message: 'Forbidden - Admin access required'
      }, { status: 403 });
    }
    
    // If everything is good, return null to continue the request
    return null;
  } catch (error) {
    console.error('Admin authentication error:', error);
    return NextResponse.json({
      success: false,
      message: 'Authentication failed',
      error: (error as Error).message
    }, { status: 500 });
  }
}

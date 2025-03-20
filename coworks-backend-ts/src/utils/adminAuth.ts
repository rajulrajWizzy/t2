import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './jwt';
import { AdminRole } from '@/models/admin';

/**
 * Verify admin authentication from request
 * @param request Next.js request object
 * @returns Decoded admin info or error response
 */
export async function verifyAdminAuth(request: NextRequest): Promise<any | NextResponse> {
  // Extract token from Authorization header
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return NextResponse.json(
      { success: false, message: 'Authorization token is required' },
      { status: 401 }
    );
  }
  
  try {
    // Verify the token
    const decoded = await verifyToken(token);
    
    // Validate required fields and admin flag
    if (!decoded.id || !decoded.email || !decoded.is_admin) {
      return NextResponse.json(
        { success: false, message: 'Invalid admin token' },
        { status: 401 }
      );
    }
    
    return decoded;
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}

/**
 * Verify that the admin has super admin role
 * @param request Next.js request object
 * @returns Decoded admin info or error response
 */
export async function verifySuperAdmin(request: NextRequest): Promise<any | NextResponse> {
  const adminAuth = await verifyAdminAuth(request);
  
  // If verifyAdminAuth returned an error response
  if ('status' in adminAuth) {
    return adminAuth as NextResponse;
  }
  
  // Check if the admin has super admin role
  if (adminAuth.role !== AdminRole.SUPER_ADMIN) {
    return NextResponse.json(
      { success: false, message: 'Super admin privileges required' },
      { status: 403 }
    );
  }
  
  return adminAuth;
}

/**
 * Verify admin has access to a specific branch
 * @param request Next.js request object
 * @param branchId Branch ID to check
 * @returns Decoded admin info or error response
 */
export async function verifyBranchAccess(
  request: NextRequest, 
  branchId?: number | string
): Promise<any | NextResponse> {
  const adminAuth = await verifyAdminAuth(request);
  
  // If verifyAdminAuth returned an error response
  if ('status' in adminAuth) {
    return adminAuth as NextResponse;
  }
  
  // Super admins have access to all branches
  if (adminAuth.role === AdminRole.SUPER_ADMIN) {
    return adminAuth;
  }
  
  // If branch ID is not provided, use the one from the token
  const targetBranchId = branchId ? Number(branchId) : adminAuth.branch_id;
  
  // Branch admins can only access their assigned branch
  if (adminAuth.branch_id !== targetBranchId) {
    return NextResponse.json(
      { success: false, message: 'Access denied: You do not have permission to access this branch' },
      { status: 403 }
    );
  }
  
  return adminAuth;
} 
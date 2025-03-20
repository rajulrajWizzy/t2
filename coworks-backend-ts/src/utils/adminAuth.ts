import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, JWTPayload } from './jwt';
import { AdminRole } from '@/models/admin';
import models from '@/models';

// Extended interface for admin token payload
export interface AdminJWTPayload extends JWTPayload {
  role: string;
}

/**
 * Verify an admin request's Authorization token
 * @param request Next.js request object
 * @returns Decoded token payload or error response
 */
export async function verifyAdmin(request: Request): Promise<AdminJWTPayload | NextResponse> {
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
    
    // Validate required fields
    if (!decoded.id || !decoded.email || !decoded.role) {
      return NextResponse.json(
        { success: false, message: 'Invalid token format' },
        { status: 401 }
      );
    }
    
    // Verify user is an admin
    if (decoded.role !== 'admin' && decoded.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }
    
    // Check if admin exists in the database
    const admin = await models.Admin.findByPk(decoded.id);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Admin not found' },
        { status: 404 }
      );
    }
    
    return decoded as AdminJWTPayload;
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
  const adminAuth = await verifyAdmin(request);
  
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
  const adminAuth = await verifyAdmin(request);
  
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
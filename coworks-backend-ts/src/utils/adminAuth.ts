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
<<<<<<< Updated upstream
<<<<<<< Updated upstream
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
=======
export async function verifyAdmin(request: Request | NextRequest): Promise<AdminJWTPayload | NextResponse> {
  try {
=======
export async function verifyAdmin(request: Request | NextRequest): Promise<AdminJWTPayload | NextResponse> {
  try {
>>>>>>> Stashed changes
    // Extract token from Authorization header
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Authorization token is required', data: null },
        { status: 401 }
      );
    }
    
    // Verify the token first without database check
    let decoded: AdminJWTPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as AdminJWTPayload;
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Invalid or expired token', data: null },
        { status: 401 }
      );
    }
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
    
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
    
<<<<<<< Updated upstream
<<<<<<< Updated upstream
    // Check if admin exists in the database
    const admin = await models.Admin.findByPk(decoded.id);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Admin not found' },
        { status: 404 }
      );
    }
    
    return decoded as AdminJWTPayload;
=======
=======
>>>>>>> Stashed changes
    // Try to check database, but don't fail if database is unavailable
    try {
      // Check if token is blacklisted
      const blacklistedToken = await models.BlacklistedToken.findOne({
        where: { token }
      });
      
      if (blacklistedToken) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, message: 'Token has been revoked', data: null },
          { status: 401 }
        );
      }
      
      // Check if admin exists in the database
      const admin = await models.Admin.findByPk(decoded.id);
      if (!admin) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, message: 'Admin not found', data: null },
          { status: 404 }
        );
      }
      
      // Check if admin is active
      if (!admin.is_active) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, message: 'Account is inactive. Please contact super admin.', data: null },
          { status: 403 }
        );
      }
    } catch (dbError) {
      console.error('Database verification error:', dbError);
      // If database check fails, still allow the request if the token is valid
      // This is a trade-off between security and availability
      return decoded;
    }
    
    return decoded;
>>>>>>> Stashed changes
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
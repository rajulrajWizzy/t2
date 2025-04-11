import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, verifyAdminToken } from '@/utils/jwt-wrapper';
import { AdminRole } from '@/models/admin';
import { corsHeaders } from '@/utils/jwt-wrapper';

export type Role = AdminRole | 'customer';

/**
 * Middleware function that enforces role-based access control
 * Checks if the user has one of the required roles
 * 
 * @param roles Array of roles that are allowed to access the resource
 * @returns Middleware function
 */
export function requireRole(roles: Role[]) {
  return async function middleware(request: NextRequest) {
    try {
      // Get token from authorization header or cookies
      let token: string | undefined;
      
      // First try to get token from authorization header
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
      
      // If no token in header, try to get from cookies
      if (!token) {
        const cookies = request.cookies;
        token = cookies.get('adminToken')?.value;
      }
      
      // If no token found in either location
      if (!token) {
        return NextResponse.json(
          { success: false, message: 'No authorization token provided' },
          { status: 401, headers: corsHeaders }
        );
      }
      
      // Check if requiring admin roles or customer role
      const isAdminRoute = roles.some(role => role !== 'customer');
      
      if (isAdminRoute) {
        // For admin routes, verify using admin token verification
        const adminResult = verifyAdminToken(token);
        
        if (!adminResult.valid || !adminResult.decoded) {
          return NextResponse.json(
            { success: false, message: 'Invalid admin token or insufficient permissions' },
            { status: 401, headers: corsHeaders }
          );
        }
        
        // Check if admin has required role
        const adminRole = adminResult.decoded.role as AdminRole;
        if (!roles.includes(adminRole)) {
          return NextResponse.json(
            { success: false, message: 'Insufficient admin permissions' },
            { status: 403, headers: corsHeaders }
          );
        }
        
        // Add admin info to request for use in route handlers
        (request as any).user = adminResult.decoded;
      } else {
        // For customer routes, use regular token verification
        const { valid, decoded } = await verifyToken(token);
        
        if (!valid || !decoded) {
          return NextResponse.json(
            { success: false, message: 'Invalid token' },
            { status: 401, headers: corsHeaders }
          );
        }
        
        // Customer tokens should not have admin role
        if (decoded.is_admin) {
          return NextResponse.json(
            { success: false, message: 'Admin tokens are not valid for customer routes' },
            { status: 403, headers: corsHeaders }
          );
        }
        
        // Add customer info to request for use in route handlers
        (request as any).user = decoded;
      }
      
      // For authenticated requests, continue to the route handler
      const response = NextResponse.next();
      // Copy the user info to the response headers for route handlers
      response.headers.set('x-user-info', JSON.stringify((request as any).user));
      return response;
    } catch (error) {
      console.error('[Role Middleware] Error:', error);
      return NextResponse.json(
        { success: false, message: 'Authentication error' },
        { status: 500, headers: corsHeaders }
      );
    }
  };
}

// Helper functions for specific role requirements
export const requireSuperAdmin = () => requireRole([AdminRole.SUPER_ADMIN]);
export const requireAdmin = () => requireRole([AdminRole.SUPER_ADMIN, AdminRole.BRANCH_ADMIN]);
export const requireSupportAdmin = () => requireRole([AdminRole.SUPER_ADMIN, AdminRole.SUPPORT_ADMIN]);
export const requireCustomer = () => requireRole(['customer']);
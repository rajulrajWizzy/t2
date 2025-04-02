// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/utils/jwt-wrapper';
import { verifyAdminToken, generateAdminToken } from '@/utils/adminAuth';
import { ApiResponse } from '@/types/api';

/**
 * Route handler for refreshing admin tokens
 * This endpoint allows admins to refresh their authentication token
 * without needing to log in again, as long as their current token is valid
 */
export async function POST(request: NextRequest) {
  console.log('[POST] /api/admin/auth/refresh - Request received');
  
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[POST] /api/admin/auth/refresh - No valid authorization header');
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Authorization header is required', data: null },
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Extract and verify the token
    const token = authHeader.split(' ')[1];
    const { valid, decoded, message } = verifyAdminToken(token);
    
    if (!valid || !decoded) {
      console.log('[POST] /api/admin/auth/refresh - Invalid token:', message);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: message || 'Invalid token', data: null },
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Generate a new token with the same payload but extended expiration
    const newToken = generateAdminToken(decoded);
    
    console.log('[POST] /api/admin/auth/refresh - Token refreshed for admin:', decoded.username);
    
    // Return the new token
    return NextResponse.json<ApiResponse<{ token: string, admin: any }>>(
      { 
        success: true, 
        message: 'Token refreshed successfully', 
        data: { 
          token: newToken,
          admin: {
            id: decoded.id,
            username: decoded.username,
            email: decoded.email,
            name: decoded.name,
            role: decoded.role
          }
        } 
      },
      { status: 200, headers: corsHeaders }
    );
    
  } catch (error: any) {
    console.error('[POST] /api/admin/auth/refresh - Error:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, message: error.message || 'Internal server error', data: null },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Add OPTIONS handler for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

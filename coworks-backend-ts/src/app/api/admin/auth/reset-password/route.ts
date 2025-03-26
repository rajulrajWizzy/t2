// Properly configured Next.js API route directives
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Import middleware bypass configuration
import { bypassMiddleware } from '../middleware-bypass';

// Apply middleware bypass configuration
export const config = bypassMiddleware;

import { NextRequest, NextResponse } from 'next/server';
import AdminModel from '@/models/admin';
import { verifyResetToken } from '@/utils/token';
import { ApiResponse } from '@/types/common';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Reset password endpoint for administrators
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.token || !body.password) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Token and new password are required',
        error: 'VALIDATION_ERROR',
        data: null
      }, { status: 400, headers: corsHeaders });
    }
    
    // This is a placeholder - in a real implementation, you would:
    // 1. Verify the token is valid and not expired
    // 2. Validate the new password meets requirements
    // 3. Update the admin's password in the database
    // 4. Mark the token as used
    
    // For now, return a mock success response
    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: 'Admin password reset endpoint is working',
      data: {
        mockImplementation: true,
        timestamp: new Date().toISOString()
      }
    }, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error('Admin password reset error:', error);
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'An error occurred during admin password reset',
      error: (error as Error).message,
      data: null
    }, { status: 500, headers: corsHeaders });
  }
}

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
} 
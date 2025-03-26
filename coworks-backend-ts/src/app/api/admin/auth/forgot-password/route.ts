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
import { generateResetToken, sendAdminPasswordResetEmail } from '@/utils/email';
import { ApiResponse } from '@/types/common';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Admin forgot password endpoint
 * @param req Request object
 * @returns Response indicating email sent status
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('[Admin Forgot Password] Processing request');
  
  try {
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
      });
    }
    
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[Admin Forgot Password] Failed to parse request body:', parseError);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Invalid request format', data: null },
        { status: 400, headers: corsHeaders }
      );
    }
    
    const { email } = body;
    
    if (!email) {
      console.log('[Admin Forgot Password] Missing email');
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Email is required', data: null },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Find admin by email
    const admin = await AdminModel.findOne({ where: { email, is_active: true } });
    
    // Always return success even if admin doesn't exist (security best practice)
    if (!admin) {
      console.log(`[Admin Forgot Password] No active admin found for email: ${email}`);
      return NextResponse.json<ApiResponse<null>>(
        { 
          success: true, 
          message: 'If this email is associated with an admin account, a password reset link has been sent', 
          data: null 
        },
        { status: 200, headers: corsHeaders }
      );
    }
    
    // Generate reset token
    const resetToken = await generateResetToken(admin.id, 'admin');
    
    // Send password reset email
    await sendAdminPasswordResetEmail(admin.email, admin.name, resetToken);
    
    console.log(`[Admin Forgot Password] Reset email sent to: ${email}`);
    
    return NextResponse.json<ApiResponse<null>>(
      { 
        success: true, 
        message: 'If this email is associated with an admin account, a password reset link has been sent', 
        data: null 
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Admin Forgot Password] Error:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, message: 'Something went wrong, please try again later', data: null },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
} 
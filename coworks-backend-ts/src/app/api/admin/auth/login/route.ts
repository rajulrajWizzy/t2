// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import AdminModel, { AdminRole } from '@/models/admin';
import { comparePasswords } from '@/utils/password';
import { ApiResponse } from '@/types/common';

// Set up CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d'; // 1 day by default

/**
 * Admin login endpoint
 * @param req Request object
 * @returns Response with JWT token
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('[Admin Login] Processing login request from:', request.headers.get('user-agent'));
  console.log('[Admin Login] Request origin:', request.headers.get('origin'));
  
  try {    
    // For CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
      });
    }
    
    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log(`[Admin Login] Request body parsed successfully`);
    } catch (parseError) {
      console.error('[Admin Login] Failed to parse request body:', parseError);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Invalid request format', data: null },
        { status: 400, headers: corsHeaders }
      );
    }
    
    const { username, password } = body;
    
    if (!username) {
      console.log('[Admin Login] Missing username');
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Username is required', data: null },
        { status: 400, headers: corsHeaders }
      );
    }
    
    if (!password) {
      console.log('[Admin Login] Missing password');
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Password is required', data: null },
        { status: 400, headers: corsHeaders }
      );
    }
    
    console.log(`[Admin Login] Attempt for username: ${username}`);

    // Find admin by username or email
    let admin;
    try {
      admin = await AdminModel.findOne({
        where: {
          [username.includes('@') ? 'email' : 'username']: username,
          is_active: true
        }
      });
    } catch (dbError) {
      console.error('[Admin Login] Database error when finding admin:', dbError);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Database error, please try again later', data: null },
        { status: 500, headers: corsHeaders }
      );
    }

    // Check if admin exists
    if (!admin) {
      console.log(`[Admin Login] Admin not found for: ${username}`);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Invalid credentials', data: null },
        { status: 401, headers: corsHeaders }
      );
    }

    console.log(`[Admin Login] Admin found: ${admin.id}, role: ${admin.role}`);
    
    // Verify password using the model's validatePassword method
    let isPasswordValid = false;
    try {
      isPasswordValid = await admin.validatePassword(password);
    } catch (passwordError) {
      console.error('[Admin Login] Password validation error:', passwordError);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Authentication error', data: null },
        { status: 500, headers: corsHeaders }
      );
    }
    
    if (!isPasswordValid) {
      console.log(`[Admin Login] Invalid password for admin: ${admin.id}`);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Invalid credentials', data: null },
        { status: 401, headers: corsHeaders }
      );
    }

    console.log(`[Admin Login] Password valid for admin: ${admin.id}`);

    // Update last login timestamp
    try {
      await admin.update({ last_login: new Date() });
    } catch (updateError) {
      console.error('[Admin Login] Failed to update last login time:', updateError);
      // Continue with login process even if updating timestamp fails
    }

    // Ensure admin has permissions set
    if (!admin.permissions) {
      try {
        admin.permissions = AdminModel.getDefaultPermissions(admin.role);
        await admin.save();
      } catch (permissionError) {
        console.error('[Admin Login] Failed to set default permissions:', permissionError);
        // Continue with login process even if setting permissions fails
      }
    }

    // Generate JWT token with admin data and is_admin flag
    let token;
    try {
      token = jwt.sign(
        {
          id: admin.id,
          email: admin.email,
          username: admin.username,
          name: admin.name,
          role: admin.role,
          branch_id: admin.branch_id,
          permissions: admin.permissions,
          is_admin: true
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
    } catch (tokenError) {
      console.error('[Admin Login] Token generation error:', tokenError);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Failed to generate authentication token', data: null },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`[Admin Login] Login successful for admin: ${admin.id}`);

    // Return token and admin data (excluding password)
    const adminData = admin.toJSON();
    // Fix for linter error: create a shallow copy with omitted password field instead of using delete
    const { password: _, ...adminDataWithoutPassword } = adminData;

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: 'Login successful',
      data: {
        admin: adminDataWithoutPassword,
        token
      }
    }, { 
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, message: 'Something went wrong, please try again later', data: null },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Support OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

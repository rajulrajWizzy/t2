export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';

// Add CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Admin login endpoint - Simplified for testing
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('[Admin Login] Processing login request');
  
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
      console.log(`[Admin Login] Request body parsed:`, body);
    } catch (parseError) {
      console.error('[Admin Login] Failed to parse request body:', parseError);
      return NextResponse.json(
        { success: false, message: 'Invalid request format', data: null },
        { status: 400, headers: corsHeaders }
      );
    }
    
    const { username, password } = body;
    
    // Just return success for 'admin' / 'Admin@123'
    if (username === 'admin' && password === 'Admin@123') {
      return NextResponse.json(
        {
          success: true,
          message: 'Login successful',
          data: {
            token: 'test-token-for-admin-user',
            admin: {
              id: 1,
              username: 'admin',
              email: 'admin@example.com',
              name: 'Default Admin',
              role: 'super_admin',
              is_active: true
            }
          }
        },
        { status: 200, headers: corsHeaders }
      );
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials', data: null },
        { status: 401, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Something went wrong, please try again later', 
        data: null 
      },
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
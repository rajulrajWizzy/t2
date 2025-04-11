// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';
import { db } from '@/lib/db';

// Add CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Refresh admin token
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check database connection
    try {
      await db.authenticate();
      console.log('Database connection established');
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { success: false, message: 'Database connection error' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Get user_id from request
    const { user_id } = await request.json();
    if (!user_id) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate a new token with minimal verification
    // In a production system, you would verify the user exists in the database
    const mockAdmin = {
      id: user_id,
      email: 'admin@coworks.com',
      name: 'Super Admin',
      role: 'super_admin',
      branch_id: null,
      is_admin: true,
      permissions: {
        seats: ['read', 'create', 'update', 'delete'],
        admins: ['read', 'create', 'update', 'delete'],
        reports: ['read', 'create'],
        support: ['read', 'update', 'delete'],
        bookings: ['read', 'create', 'update', 'delete'],
        branches: ['read', 'create', 'update', 'delete'],
        payments: ['read', 'update'],
        settings: ['read', 'update'],
        customers: ['read', 'create', 'update', 'delete'],
        seating_types: ['read', 'create', 'update', 'delete']
      }
    };
    
    const token = sign(
      mockAdmin,
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '72h' }
    );

    const response = NextResponse.json(
      { 
        success: true,
        message: 'Token refreshed successfully',
        data: { token, admin: mockAdmin }
      },
      { status: 200, headers: corsHeaders }
    );

    // Also set cookie on the server response
    response.cookies.set('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 72 * 60 * 60, // 72 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to refresh token' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}

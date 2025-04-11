export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { Admin } from '@/models/admin';
import { compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { db } from '@/lib/db';

// Add CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Admin login endpoint
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
        { message: 'Database connection error' },
        { status: 500 }
      );
    }

    const { email, password } = await request.json();
    console.log('Login attempt for email:', email);

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const admin = await Admin.findOne({ where: { email } });

    if (!admin) {
      console.log('No admin found with email:', email);
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isValidPassword = await compare(password, admin.password);

    if (!isValidPassword) {
      console.log('Invalid password for email:', email);
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = sign(
      { 
        id: admin.id, 
        email: admin.email, 
        role: admin.role || 'admin',
        name: admin.name,
        branch_id: admin.branch_id,
        permissions: admin.permissions,
        is_admin: true
      },
      process.env.JWT_SECRET!,
      { expiresIn: '72h' }
    );

    const response = NextResponse.json(
      { 
        success: true,
        data: {
          token,
          admin: {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
            branch_id: admin.branch_id,
            permissions: admin.permissions
          }
        }
      },
      { status: 200 }
    );

    response.cookies.set('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 72 * 60 * 60, // 72 hours to match refresh token
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
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
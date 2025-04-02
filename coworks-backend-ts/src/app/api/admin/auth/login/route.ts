export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import jwt from 'jsonwebtoken';
import { corsHeaders } from '@/utils/jwt-wrapper';
import bcrypt from 'bcryptjs';
import { AdminRole } from '@/models/admin';

/**
 * POST /api/admin/auth/login - Admin authentication endpoint
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Find admin by email
    const admin = await models.Admin.findOne({
      where: { email: email.toLowerCase() },
      attributes: ['id', 'email', 'password', 'name', 'role', 'branch_id', 'is_active', 'permissions']
    });

    // Check if admin exists and is active
    if (!admin || !admin.get('is_active')) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.get('password'));
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get admin role and permissions
    const role = admin.get('role') as AdminRole;
    const permissions = admin.get('permissions') || models.Admin.getDefaultPermissions(role);

    // Create JWT token with role and permissions
    const token = jwt.sign(
      {
        id: admin.get('id'),
        email: admin.get('email'),
        name: admin.get('name'),
        role,
        branch_id: admin.get('branch_id'),
        permissions,
        is_admin: true
      },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    // Update last login
    await admin.update({ last_login: new Date() });

    // Return success response with admin data and token
    return NextResponse.json(
      {
        success: true,
        message: 'Login successful',
        data: {
          token,
          admin: {
            id: admin.get('id'),
            email: admin.get('email'),
            name: admin.get('name'),
            role,
            branch_id: admin.get('branch_id'),
            permissions
          }
        }
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('[Admin Login API] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Authentication failed' },
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
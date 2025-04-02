// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { corsHeaders } from '@/utils/jwt-wrapper';
import { requireAdmin } from '../../middleware/requireRole';

/**
 * GET /api/admin/profile - Get admin profile
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Apply admin middleware
    const middleware = requireAdmin();
    const middlewareResponse = await middleware(request);
    if (middlewareResponse.status !== 200) {
      return middlewareResponse;
    }

    // Get admin ID from token
    const user = (request as any).user;
    const adminId = user.id;

    // Find admin
    const admin = await models.Admin.findOne({
      where: { id: adminId },
      attributes: [
        'id', 'email', 'name', 'role', 'branch_id', 'phone', 
        'profile_picture', 'is_active', 'permissions', 'last_login'
      ]
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Admin not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Profile retrieved successfully',
        data: { admin }
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('[Admin Profile API] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve profile' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PUT /api/admin/profile - Update admin profile
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    // Apply admin middleware
    const middleware = requireAdmin();
    const middlewareResponse = await middleware(request);
    if (middlewareResponse.status !== 200) {
      return middlewareResponse;
    }

    // Get admin ID from token
    const user = (request as any).user;
    const adminId = user.id;

    // Parse request body
    const body = await request.json();
    const { name, phone, profile_picture } = body;

    // Find admin
    const admin = await models.Admin.findByPk(adminId);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Admin not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Update profile
    await admin.update({
      name: name || admin.get('name'),
      phone: phone || admin.get('phone'),
      profile_picture: profile_picture || admin.get('profile_picture')
    });

    // Get updated admin data
    const updatedAdmin = await models.Admin.findOne({
      where: { id: adminId },
      attributes: [
        'id', 'email', 'name', 'role', 'branch_id', 'phone', 
        'profile_picture', 'is_active', 'permissions', 'last_login'
      ]
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Profile updated successfully',
        data: { admin: updatedAdmin }
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('[Admin Profile API] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update profile' },
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

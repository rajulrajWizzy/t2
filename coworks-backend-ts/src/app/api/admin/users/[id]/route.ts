// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { corsHeaders } from '@/utils/jwt-wrapper';
import { requireSuperAdmin } from '@/app/api/middleware/requireRole';
import bcrypt from 'bcryptjs';
import { AdminRole } from '@/models/admin';

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/admin/users/[id] - Get admin user details (super admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    // Apply super admin middleware
    const middleware = requireSuperAdmin();
    const middlewareResponse = await middleware(request);
    if (middlewareResponse.status !== 200) {
      return middlewareResponse;
    }

    // Validate admin ID
    const adminId = parseInt(params.id);
    if (isNaN(adminId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid admin ID' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Find admin
    const admin = await models.Admin.findOne({
      where: { id: adminId },
      attributes: [
        'id', 'email', 'name', 'role', 'branch_id', 'phone', 
        'profile_picture', 'is_active', 'permissions', 'last_login',
        'created_at', 'updated_at'
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
        message: 'Admin retrieved successfully',
        data: { admin }
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('[Admin User Detail API] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve admin' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PUT /api/admin/users/[id] - Update admin user (super admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    // Apply super admin middleware
    const middleware = requireSuperAdmin();
    const middlewareResponse = await middleware(request);
    if (middlewareResponse.status !== 200) {
      return middlewareResponse;
    }

    // Validate admin ID
    const adminId = parseInt(params.id);
    if (isNaN(adminId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid admin ID' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, role, branch_id, phone, is_active, password } = body;

    // Find admin
    const admin = await models.Admin.findByPk(adminId);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Admin not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Check if this is the last super admin
    if (role && role !== AdminRole.SUPER_ADMIN && admin.get('role') === AdminRole.SUPER_ADMIN) {
      const isLastSuperAdmin = await models.Admin.isLastSuperAdmin(adminId);
      if (isLastSuperAdmin) {
        return NextResponse.json(
          { success: false, message: 'Cannot change role of the last super admin' },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Validate role if provided
    if (role && !Object.values(AdminRole).includes(role)) {
      return NextResponse.json(
        { success: false, message: 'Invalid role' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Update admin
    const updateData: any = {
      name: name || admin.get('name'),
      role: role || admin.get('role'),
      branch_id: branch_id !== undefined ? branch_id : admin.get('branch_id'),
      phone: phone || admin.get('phone'),
      is_active: is_active !== undefined ? is_active : admin.get('is_active')
    };

    // Update password if provided
    if (password) {
      if (!models.Admin.isPasswordValid(password)) {
        return NextResponse.json(
          { success: false, message: 'Password does not meet requirements' },
          { status: 400, headers: corsHeaders }
        );
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update permissions if role changed
    if (role && role !== admin.get('role')) {
      updateData.permissions = models.Admin.getDefaultPermissions(role);
    }

    await admin.update(updateData);

    // Get updated admin data
    const updatedAdmin = await models.Admin.findOne({
      where: { id: adminId },
      attributes: [
        'id', 'email', 'name', 'role', 'branch_id', 'phone', 
        'profile_picture', 'is_active', 'permissions', 'last_login',
        'created_at', 'updated_at'
      ]
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Admin updated successfully',
        data: { admin: updatedAdmin }
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('[Admin User Detail API] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update admin' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * DELETE /api/admin/users/[id] - Delete admin user (super admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    // Apply super admin middleware
    const middleware = requireSuperAdmin();
    const middlewareResponse = await middleware(request);
    if (middlewareResponse.status !== 200) {
      return middlewareResponse;
    }

    // Validate admin ID
    const adminId = parseInt(params.id);
    if (isNaN(adminId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid admin ID' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Find admin
    const admin = await models.Admin.findByPk(adminId);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Admin not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Check if this is the last super admin
    if (admin.get('role') === AdminRole.SUPER_ADMIN) {
      const isLastSuperAdmin = await models.Admin.isLastSuperAdmin(adminId);
      if (isLastSuperAdmin) {
        return NextResponse.json(
          { success: false, message: 'Cannot delete the last super admin' },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Delete admin
    await admin.destroy();

    return NextResponse.json(
      {
        success: true,
        message: 'Admin deleted successfully'
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('[Admin User Detail API] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete admin' },
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
// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";


import { NextRequest, NextResponse } from 'next/server';
import AdminModel, { AdminRole } from '@/models/admin';
import { verifyAdmin } from '@/utils/adminAuth';
import { ApiResponse } from '@/types/api';

/**
 * GET /api/admin/users/[id] - Get admin user details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const adminAuth = await verifyAdmin(request);
    
    // If verifyAdmin returned an error response
    if ('status' in adminAuth) {
      return adminAuth as NextResponse;
    }
    
    // Only super admin can access other admin details
    if (adminAuth.role !== AdminRole.SUPER_ADMIN) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Unauthorized: Requires super admin privileges',
        data: null
      }, { status: 403 });
    }
    
    // Get admin ID from params
    const adminId = parseInt(params.id);
    
    if (isNaN(adminId) || adminId <= 0) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Invalid admin ID',
        data: null
      }, { status: 400 });
    }
    
    // Find admin by ID
    const admin = await AdminModel.findByPk(adminId, {
      attributes: { exclude: ['password'] }
    });
    
    if (!admin) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Admin not found',
        data: null
      }, { status: 404 });
    }
    
    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: 'Admin details retrieved successfully',
      data: admin
    }, { status: 200 });
    
  } catch (error) {
    console.error('Get admin error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to retrieve admin details',
      data: null
    }, { status: 500 });
  }
}

/**
 * PUT /api/admin/users/[id] - Update admin user
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const adminAuth = await verifyAdmin(request);
    
    // If verifyAdmin returned an error response
    if ('status' in adminAuth) {
      return adminAuth as NextResponse;
    }
    
    // Only super admin can update other admins
    if (adminAuth.role !== AdminRole.SUPER_ADMIN && adminAuth.id !== parseInt(params.id)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Unauthorized: Requires super admin privileges or self-update',
        data: null
      }, { status: 403 });
    }
    
    // Get admin ID from params
    const adminId = parseInt(params.id);
    
    if (isNaN(adminId) || adminId <= 0) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Invalid admin ID',
        data: null
      }, { status: 400 });
    }
    
    // Find admin by ID
    const admin = await AdminModel.findByPk(adminId);
    
    if (!admin) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Admin not found',
        data: null
      }, { status: 404 });
    }
    
    // Get request body
    const body = await request.json();
    const {
      username,
      email,
      password,
      name,
      phone,
      profile_image,
      role,
      branch_id,
      is_active
    } = body;
    
    // Regular admins can't update their own role or status
    if (adminAuth.id === adminId && adminAuth.role !== AdminRole.SUPER_ADMIN) {
      // Allow updating profile details but not role or active status
      if (role !== undefined || is_active !== undefined) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Unauthorized: Cannot update own role or active status',
          data: null
        }, { status: 403 });
      }
    }
    
    // Only super admin can change roles
    if (role !== undefined && adminAuth.role !== AdminRole.SUPER_ADMIN) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Unauthorized: Only super admin can change roles',
        data: null
      }, { status: 403 });
    }
    
    // Check if changing a super admin's status while being the only one
    if (
      is_active !== undefined && 
      is_active === false && 
      admin.role === AdminRole.SUPER_ADMIN
    ) {
      const isSuperAdminLast = await AdminModel.isLastSuperAdmin(adminId);
      if (isSuperAdminLast) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Cannot deactivate the last super admin',
          data: null
        }, { status: 400 });
      }
    }
    
    // Validate email format if provided
    if (email !== undefined && !AdminModel.isEmailValid(email)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Invalid email format',
        data: null
      }, { status: 400 });
    }
    
    // Validate password complexity if provided
    if (password !== undefined && !AdminModel.isPasswordValid(password)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
        data: null
      }, { status: 400 });
    }
    
    // If changing role to branch admin, branch_id is required
    if (role === AdminRole.BRANCH_ADMIN && branch_id === undefined && !admin.branch_id) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Branch ID is required for branch admin role',
        data: null
      }, { status: 400 });
    }
    
    // Prepare update data
    const updateData: any = {};
    
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (password !== undefined) updateData.password = password;
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (profile_image !== undefined) updateData.profile_image = profile_image;
    if (role !== undefined) updateData.role = role;
    if (branch_id !== undefined) updateData.branch_id = branch_id;
    if (is_active !== undefined) updateData.is_active = is_active;
    
    // Update admin
    await admin.update(updateData);
    
    // Return updated admin (exclude password)
    const updatedAdmin = admin.toJSON();
    delete updatedAdmin.password;
    
    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: 'Admin updated successfully',
      data: updatedAdmin
    }, { status: 200 });
    
  } catch (error) {
    console.error('Update admin error:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message === 'Branch admin must be assigned to a branch') {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: error.message,
          data: null
        }, { status: 400 });
      }
    }
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to update admin',
      data: null
    }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users/[id] - Delete admin user
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const adminAuth = await verifyAdmin(request);
    
    // If verifyAdmin returned an error response
    if ('status' in adminAuth) {
      return adminAuth as NextResponse;
    }
    
    // Only super admin can delete admins
    if (adminAuth.role !== AdminRole.SUPER_ADMIN) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Unauthorized: Requires super admin privileges',
        data: null
      }, { status: 403 });
    }
    
    // Get admin ID from params
    const adminId = parseInt(params.id);
    
    if (isNaN(adminId) || adminId <= 0) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Invalid admin ID',
        data: null
      }, { status: 400 });
    }
    
    // Prevent deleting self
    if (adminAuth.id === adminId) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Cannot delete your own account',
        data: null
      }, { status: 400 });
    }
    
    // Find admin by ID
    const admin = await AdminModel.findByPk(adminId);
    
    if (!admin) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Admin not found',
        data: null
      }, { status: 404 });
    }
    
    // Check if this is the last super admin
    if (admin.role === AdminRole.SUPER_ADMIN) {
      const isSuperAdminLast = await AdminModel.isLastSuperAdmin(adminId);
      if (isSuperAdminLast) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Cannot delete the last super admin',
          data: null
        }, { status: 400 });
      }
    }
    
    // Delete admin
    await admin.destroy();
    
    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: 'Admin deleted successfully',
      data: null
    }, { status: 200 });
    
  } catch (error) {
    console.error('Delete admin error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to delete admin',
      data: null
    }, { status: 500 });
  }
} 
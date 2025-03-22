// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/adminAuth';
import AdminModel from '@/models/admin';
import { ApiResponse } from '@/types/api';
import { hashPassword } from '@/utils/password';

/**
 * PUT /api/admin/profile/update - Update authenticated admin profile
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminAuth = await verifyAdmin(request);
    
    // If verifyAdmin returned an error response
    if ('status' in adminAuth) {
      return adminAuth as NextResponse;
    }
    
    // Parse request body
    const body = await request.json();
    const { name, email, username, current_password, new_password, profile_picture } = body;
    
    // Find the admin
    const admin = await AdminModel.findByPk(adminAuth.id);
    if (!admin) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Admin not found',
        data: null
      }, { status: 404 });
    }
    
    // Create object with fields to update
    const updateData: any = {};
    
    // Update basic profile information
    if (name) updateData.name = name;
    if (profile_picture) updateData.profile_picture = profile_picture;
    
    // Update email (check if not already used by another admin)
    if (email && email !== admin.email) {
      const existingAdmin = await AdminModel.findOne({ where: { email } });
      if (existingAdmin && existingAdmin.id !== admin.id) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Email is already in use',
          data: null
        }, { status: 400 });
      }
      updateData.email = email;
    }
    
    // Update username (check if not already used by another admin)
    if (username && username !== admin.username) {
      const existingAdmin = await AdminModel.findOne({ where: { username } });
      if (existingAdmin && existingAdmin.id !== admin.id) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Username is already in use',
          data: null
        }, { status: 400 });
      }
      updateData.username = username;
    }
    
    // Update password if both current and new passwords are provided
    if (current_password && new_password) {
      // Verify current password
      const isPasswordValid = await admin.validatePassword(current_password);
      if (!isPasswordValid) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Current password is incorrect',
          data: null
        }, { status: 400 });
      }
      
      // Hash new password
      updateData.password = await hashPassword(new_password);
    }
    
    // If nothing to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'No data provided for update',
        data: null
      }, { status: 400 });
    }
    
    // Update admin profile
    await admin.update(updateData);
    
    // Fetch updated admin (excluding password)
    const updatedAdmin = await AdminModel.findByPk(adminAuth.id, {
      include: adminAuth.branch_id ? [
        { association: 'Branch', attributes: ['id', 'name', 'location', 'short_code'] }
      ] : [],
      attributes: { exclude: ['password'] }
    });
    
    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: 'Profile updated successfully',
      data: updatedAdmin
    }, { status: 200 });
    
  } catch (error) {
    console.error('Admin profile update error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to update profile',
      data: null
    }, { status: 500 });
  }
} 

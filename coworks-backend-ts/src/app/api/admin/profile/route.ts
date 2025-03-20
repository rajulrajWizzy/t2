import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/utils/adminAuth';
import AdminModel from '@/models/admin';
import { ApiResponse } from '@/types/api';

/**
 * GET /api/admin/profile - Get authenticated admin profile
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminAuth = await verifyAdminAuth(request);
    
    // If verifyAdminAuth returned an error response
    if ('status' in adminAuth) {
      return adminAuth as NextResponse;
    }
    
    // Fetch admin with branch details if attached to a branch
    const admin = await AdminModel.findByPk(adminAuth.id, {
      include: adminAuth.branch_id ? [
        { association: 'Branch', attributes: ['id', 'name', 'location', 'short_code'] }
      ] : [],
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
      message: 'Admin profile retrieved successfully',
      data: admin
    }, { status: 200 });
    
  } catch (error) {
    console.error('Admin profile error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to retrieve admin profile',
      data: null
    }, { status: 500 });
  }
} 
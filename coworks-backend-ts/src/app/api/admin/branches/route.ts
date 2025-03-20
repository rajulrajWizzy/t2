import { NextRequest, NextResponse } from 'next/server';
import { Op } from 'sequelize';
import { verifyAdminAuth, verifyBranchAccess, verifySuperAdmin } from '@/utils/adminAuth';
import models from '@/models';
import { ApiResponse } from '@/types/api';

/**
 * GET /api/admin/branches - Get branches with pagination and filtering
 * Super Admin: Access to all branches
 * Branch Admin: Access only to their assigned branch
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminAuth = await verifyAdminAuth(request);
    
    // If verifyAdminAuth returned an error response
    if ('status' in adminAuth) {
      return adminAuth as NextResponse;
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    // Build where clause
    const whereClause: any = {};
    
    // Add search filter if provided
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } },
        { short_code: { [Op.like]: `%${search}%` } }
      ];
    }
    
    // Add status filter if provided
    if (status) {
      whereClause.is_active = status === 'active';
    }
    
    // Branch admins can only see their assigned branch
    if (adminAuth.role !== 'super_admin' && adminAuth.branch_id) {
      whereClause.id = adminAuth.branch_id;
    }
    
    // Get branches with pagination
    const { count, rows: branches } = await models.Branch.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      attributes: [
        'id', 'name', 'location', 'description', 'short_code',
        'contact_email', 'contact_phone', 'is_active', 'created_at', 'updated_at'
      ],
      include: [
        {
          association: 'SeatingTypes',
          attributes: ['id', 'name', 'short_code', 'price_hourly', 'price_daily', 'price_monthly']
        }
      ]
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(count / limit);
    
    return NextResponse.json<ApiResponse<typeof branches>>({
      success: true,
      message: 'Branches retrieved successfully',
      data: branches,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        per_page: limit,
        total_items: count
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('Admin branches error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to retrieve branches',
      data: null
    }, { status: 500 });
  }
}

/**
 * POST /api/admin/branches - Create a new branch (Super Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify super admin authentication
    const adminAuth = await verifySuperAdmin(request);
    
    // If verifySuperAdmin returned an error response
    if ('status' in adminAuth) {
      return adminAuth as NextResponse;
    }
    
    // Parse request body
    const body = await request.json();
    const { 
      name, location, description, contact_email, contact_phone, 
      is_active = true, short_code
    } = body;
    
    // Validate required fields
    if (!name || !location || !short_code) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Name, location, and short code are required',
        data: null
      }, { status: 400 });
    }
    
    // Check if branch with same short code exists
    const existingBranch = await models.Branch.findOne({
      where: { short_code }
    });
    
    if (existingBranch) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'A branch with this short code already exists',
        data: null
      }, { status: 400 });
    }
    
    // Create new branch
    const branch = await models.Branch.create({
      name,
      location,
      description,
      contact_email,
      contact_phone,
      is_active,
      short_code
    });
    
    return NextResponse.json<ApiResponse<typeof branch>>({
      success: true,
      message: 'Branch created successfully',
      data: branch
    }, { status: 201 });
    
  } catch (error) {
    console.error('Admin create branch error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to create branch',
      data: null
    }, { status: 500 });
  }
} 
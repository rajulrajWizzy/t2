// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

// Explicitly set Node.js runtime for this route

// Explicitly set Node.js runtime for this route

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/utils/jwt';
import models from '@/models';
import { Op } from 'sequelize';
import { verifyAdmin, verifyBranchAccess, verifySuperAdmin } from '@/utils/adminAuth';
import { ApiResponse } from '@/types/api';
import { corsHeaders } from '@/utils/jwt-wrapper';
import { requireAdmin } from '@/app/api/middleware/requireRole';
import { formatArrayImages, formatObjectImages } from '@/utils/formatImageUrl';
import { cookies } from 'next/headers';

// Mock data for branches with more detailed information
const mockBranches = [
  {
    id: 'b1',
    name: 'Downtown Branch',
    short_code: 'DT001',
    location: '123 Main St, Downtown',
    address: '123 Main St, Downtown, City, 10001',
    description: 'Our flagship location in the heart of downtown with premium amenities.',
    contact_email: 'downtown@coworks.com',
    contact_phone: '+1234567890',
    is_active: true,
    capacity: 120,
    occupancy_rate: 85,
    total_seats: 120,
    available_seats: 18,
    total_bookings: 450,
    active_bookings: 102,
    monthly_revenue: 75000,
    longitude: -73.9857,
    latitude: 40.7484,
    created_at: '2023-01-15T10:00:00Z',
    managers: [
      { id: 2, name: 'Branch Admin 1', email: 'branchadmin1@example.com' }
    ]
  },
  {
    id: 'b2',
    name: 'Westside Branch',
    short_code: 'WS002',
    location: '456 West Ave, Westside',
    address: '456 West Ave, Westside, City, 10002',
    description: 'Modern workspace with a focus on technology startups.',
    contact_email: 'westside@coworks.com',
    contact_phone: '+1987654321',
    is_active: true,
    capacity: 85,
    occupancy_rate: 92,
    total_seats: 85,
    available_seats: 7,
    total_bookings: 320,
    active_bookings: 78,
    monthly_revenue: 62000,
    longitude: -74.0060,
    latitude: 40.7128,
    created_at: '2023-02-20T14:30:00Z',
    managers: [
      { id: 3, name: 'Branch Admin 2', email: 'branchadmin2@example.com' }
    ]
  },
  {
    id: 'b3',
    name: 'North Campus',
    short_code: 'NC003',
    location: '789 North Blvd, Northside',
    address: '789 North Blvd, Northside, City, 10003',
    description: 'Spacious campus-style workspace with outdoor areas.',
    contact_email: 'north@coworks.com',
    contact_phone: '+1122334455',
    is_active: true,
    capacity: 150,
    occupancy_rate: 78,
    total_seats: 150,
    available_seats: 33,
    total_bookings: 520,
    active_bookings: 117,
    monthly_revenue: 89000,
    longitude: -73.9654,
    latitude: 40.8116,
    created_at: '2023-03-10T09:15:00Z',
    managers: []
  },
  {
    id: 'b4',
    name: 'East Village Office',
    short_code: 'EV004',
    location: '321 East St, East Village',
    address: '321 East St, East Village, City, 10004',
    description: 'Boutique coworking space with a creative atmosphere.',
    contact_email: 'eastvillage@coworks.com',
    contact_phone: '+1555666777',
    is_active: false,
    capacity: 75,
    occupancy_rate: 0,
    total_seats: 75,
    available_seats: 75,
    total_bookings: 180,
    active_bookings: 0,
    monthly_revenue: 0,
    longitude: -73.9400,
    latitude: 40.7264,
    created_at: '2023-04-05T11:45:00Z',
    managers: []
  }
];

// Helper function to get branch stats
const getBranchStats = (branchId: string) => {
  const branch = mockBranches.find(b => b.id === branchId);
  if (!branch) return null;
  
  return {
    totalBookings: branch.total_bookings,
    activeBookings: branch.active_bookings,
    pendingBookings: Math.floor(branch.total_bookings * 0.1), // 10% of total as pending
    openTickets: Math.floor(branch.active_bookings * 0.15), // 15% of active bookings have open tickets
    totalSeats: branch.total_seats,
    availability: branch.available_seats,
    totalRevenue: branch.monthly_revenue,
    seatsByType: [
      {
        typeId: 'hot-desk',
        typeName: 'Hot Desk',
        count: Math.floor(branch.total_seats * 0.4),
        available: Math.floor(branch.available_seats * 0.4)
      },
      {
        typeId: 'dedicated-desk',
        typeName: 'Dedicated Desk',
        count: Math.floor(branch.total_seats * 0.3),
        available: Math.floor(branch.available_seats * 0.3)
      },
      {
        typeId: 'private-office',
        typeName: 'Private Office',
        count: Math.floor(branch.total_seats * 0.2),
        available: Math.floor(branch.available_seats * 0.2)
      },
      {
        typeId: 'meeting-room',
        typeName: 'Meeting Room',
        count: Math.floor(branch.total_seats * 0.1),
        available: Math.floor(branch.available_seats * 0.1)
      }
    ]
  };
};

/**
 * GET /api/admin/branches - Get all branches (admin only)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check for admin authentication
    const cookieStore = cookies();
    const adminToken = cookieStore.get('adminToken')?.value;

    if (!adminToken) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify admin token
    const adminResult = await verifyAdmin(request);
    if (adminResult instanceof NextResponse) {
      return adminResult;
    }

    // Get pagination parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Get branches with pagination
    const { count, rows: branches } = await models.Branch.findAndCountAll({
      limit,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: models.Admin,
          as: 'Admins',
          attributes: ['id', 'name', 'email'],
          through: { attributes: [] }
        },
        {
          model: models.BranchImage,
          as: 'Images',
          attributes: ['id', 'url', 'type']
        }
      ]
    });

    // Format branch data
    const formattedBranches = branches.map(branch => {
      const branchData = branch.toJSON();
      return {
        ...branchData,
        images: branchData.images ? formatArrayImages([branchData.images], ['url'], request) : [],
        managers: branchData.Admins || []
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        branches: formattedBranches,
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in branches GET endpoint:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to retrieve branches',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/admin/branches - Create a new branch (admin only)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Apply admin middleware
    const middleware = requireAdmin();
    const middlewareResponse = await middleware(request);
    if (middlewareResponse.status !== 200) {
      return middlewareResponse;
    }

    const body = await request.json();
    const {
      name,
      address,
      location,
      latitude,
      longitude,
      cost_multiplier,
      opening_time,
      closing_time,
      is_active,
      amenities,
      images
    } = body;

    // Validate required fields
    if (!name || !address || !location) {
      return NextResponse.json(
        { success: false, message: 'Name, address, and location are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create branch
    const branch = await models.Branch.create({
      name,
      address,
      location,
      latitude,
      longitude,
      cost_multiplier,
      opening_time,
      closing_time,
      is_active,
      amenities
    });

    // Add images if provided
    if (images && images.length > 0) {
      await Promise.all(
        images.map((image: string) =>
          models.BranchImage.create({
            branch_id: branch.id,
            image_url: image
          })
        )
      );
    }

    // Fetch created branch with relations
    const createdBranch = await models.Branch.findByPk(branch.id, {
      include: [
        {
          model: models.Seat,
          as: 'Seats',
          include: [
            {
              model: models.SeatingType,
              as: 'SeatingType'
            }
          ]
        },
        {
          model: models.BranchImage,
          as: 'Images'
        }
      ]
    });

    // Format image URLs in the createdBranch response
    const formattedBranch = formatObjectImages(
      createdBranch?.get({ plain: true }) || {},
      ['image_url', 'thumbnail'],
      request
    );
    
    // Also format image URLs in the Images array
    if (formattedBranch.Images && Array.isArray(formattedBranch.Images)) {
      formattedBranch.Images = formatArrayImages(formattedBranch.Images, ['image_url'], request);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Branch created successfully',
        data: formattedBranch
      },
      { status: 201, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error creating branch:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create branch' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PUT /api/admin/branches/:id - Update an existing branch (Super Admin only)
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const branchId = params?.id;
    
    if (!branchId) {
      return NextResponse.json({
        success: false,
        message: 'Branch ID is required',
        data: null
      }, { status: 400 });
    }
    
    // Verify super admin authentication
    const token = request.headers.get('authorization')?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized: No token provided',
        data: null
      }, { status: 401 });
    }
    
    try {
      const decoded = await verifyJWT(token);
      
      if (!decoded || decoded.role !== 'super_admin') {
        return NextResponse.json({
          success: false,
          message: 'Unauthorized: Super admin access required',
          data: null
        }, { status: 403 });
      }
      
      // Find the branch to update
      const branchIndex = mockBranches.findIndex(b => b.id === branchId);
      
      if (branchIndex === -1) {
        return NextResponse.json({
          success: false,
          message: 'Branch not found',
          data: null
        }, { status: 404 });
      }
      
      // Parse request body
      const body = await request.json();
      const { 
        name, location, description, contact_email, contact_phone, 
        is_active, short_code, longitude, latitude, address
      } = body;
      
      // Validate required fields
      if (!name || !location || !short_code) {
        return NextResponse.json({
          success: false,
          message: 'Name, location, and short code are required',
          data: null
        }, { status: 400 });
      }
      
      // Check if another branch has the same short code
      const duplicateShortCode = mockBranches.findIndex(b => 
        b.short_code === short_code && b.id !== branchId
      );
      
      if (duplicateShortCode !== -1) {
        return NextResponse.json({
          success: false,
          message: 'Another branch with this short code already exists',
          data: null
        }, { status: 400 });
      }
      
      // Update branch (mock implementation)
      const updatedBranch = {
        ...mockBranches[branchIndex],
        name,
        short_code,
        location,
        address: address || location,
        description: description || mockBranches[branchIndex].description,
        contact_email: contact_email || mockBranches[branchIndex].contact_email,
        contact_phone: contact_phone || mockBranches[branchIndex].contact_phone,
        is_active: is_active === undefined ? mockBranches[branchIndex].is_active : is_active,
        longitude: longitude ? parseFloat(longitude) : mockBranches[branchIndex].longitude,
        latitude: latitude ? parseFloat(latitude) : mockBranches[branchIndex].latitude,
      };
      
      // In a real implementation, you would update the database
      // mockBranches[branchIndex] = updatedBranch;
      
      return NextResponse.json({
        success: true,
        message: 'Branch updated successfully',
        data: updatedBranch
      });
    } catch (error) {
      console.error('JWT verification error:', error);
      return NextResponse.json({
        success: false,
        message: 'Authentication error',
        data: null
      }, { status: 401 });
    }
  } catch (error) {
    console.error('Admin update branch error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update branch',
      data: null
    }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/branches/:id/status - Toggle branch status (Super Admin only)
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const branchId = params?.id;
    
    if (!branchId) {
      return NextResponse.json({
        success: false,
        message: 'Branch ID is required',
        data: null
      }, { status: 400 });
    }
    
    // Verify super admin authentication
    const token = request.headers.get('authorization')?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized: No token provided',
        data: null
      }, { status: 401 });
    }
    
    try {
      const decoded = await verifyJWT(token);
      
      if (!decoded || decoded.role !== 'super_admin') {
        return NextResponse.json({
          success: false,
          message: 'Unauthorized: Super admin access required',
          data: null
        }, { status: 403 });
      }
      
      // Find the branch to update
      const branchIndex = mockBranches.findIndex(b => b.id === branchId);
      
      if (branchIndex === -1) {
        return NextResponse.json({
          success: false,
          message: 'Branch not found',
          data: null
        }, { status: 404 });
      }
      
      // Parse request body
      const body = await request.json();
      const { is_active } = body;
      
      if (is_active === undefined) {
        return NextResponse.json({
          success: false,
          message: 'is_active field is required',
          data: null
        }, { status: 400 });
      }
      
      // Update branch status (mock implementation)
      const updatedBranch = {
        ...mockBranches[branchIndex],
        is_active
      };
      
      // In a real implementation, you would update the database
      // mockBranches[branchIndex] = updatedBranch;
      
      return NextResponse.json({
        success: true,
        message: `Branch ${is_active ? 'activated' : 'deactivated'} successfully`,
        data: updatedBranch
      });
    } catch (error) {
      console.error('JWT verification error:', error);
      return NextResponse.json({
        success: false,
        message: 'Authentication error',
        data: null
      }, { status: 401 });
    }
  } catch (error) {
    console.error('Admin update branch status error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update branch status',
      data: null
    }, { status: 500 });
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}

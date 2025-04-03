// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

// Explicitly set Node.js runtime for this route

// src/app/api/branches/[id]/route.ts
// Explicitly set Node.js runtime for this route

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, corsHeaders } from '@/utils/jwt-wrapper';
import models from '@/models';
import { requireAuth } from '../../middleware/requireAuth';
import { requireAdmin } from '../../middleware/requireAdmin';
import { ApiResponse } from '@/types/common';
import { Op } from 'sequelize';

// Helper function to find branch by ID or code
async function findBranch(idOrCode: string) {
  // Check if the parameter is a numeric ID or a branch code
  const isNumeric = /^\d+$/.test(idOrCode);
  
  // Define safe attributes that are known to exist
  const safeAttributes = ['id', 'name', 'address', 'location', 'latitude', 'longitude', 
    'cost_multiplier', 'opening_time', 'closing_time', 'is_active', 'created_at', 'updated_at', 'short_code'];
  
  let whereClause = {};
  if (isNumeric) {
    whereClause = { id: parseInt(idOrCode) };
  } else {
    whereClause = { short_code: idOrCode };
  }
  
  // Try to find the branch
  const branch = await models.Branch.findOne({
    where: whereClause,
    attributes: safeAttributes,
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
      }
    ]
  });
  
  return branch;
}

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/branches/[id] - Get branch details by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    console.log(`[Branch Detail API] GET request for branch ID: ${params.id}`);
    
    // Validate branch ID
    const branchId = parseInt(params.id);
    if (isNaN(branchId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid branch ID' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    let isAdmin = false;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      // Verify the token
      const { valid, decoded } = await verifyToken(token);
      if (valid && decoded) {
        isAdmin = decoded.is_admin === true;
        console.log(`[Branch Detail API] User authenticated as ${isAdmin ? 'admin' : 'customer'}`);
      }
    }
    
    try {
      // Check database connection
      await models.sequelize.authenticate();
      
      // Build where clause - for non-admin users, only show active branches
      const whereClause: any = { id: branchId };
      if (!isAdmin) {
        whereClause.is_active = true;
      }
      
      // Find branch
      const branch = await models.Branch.findOne({
        where: whereClause
      });
      
      if (!branch) {
        return NextResponse.json(
          { success: false, message: 'Branch not found' },
          { status: 404, headers: corsHeaders }
        );
      }
      
      return NextResponse.json(
        { 
          success: true, 
          message: 'Branch retrieved successfully',
          data: { branch }
        },
        { status: 200, headers: corsHeaders }
      );
      
    } catch (dbError) {
      console.error('[Branch Detail API] Database error:', dbError);
      
      // Generate mock data for testing
      const mockBranch = {
        id: branchId,
        name: `Branch ${branchId}`,
        address: `123 Main St, City ${branchId}`,
        contact: `+1 555-000-${1000 + branchId}`,
        email: `branch${branchId}@coworks.com`,
        is_active: true,
        opening_time: '09:00:00',
        closing_time: '18:00:00'
      };
      
      return NextResponse.json(
        { 
          success: true, 
          message: 'Mock branch retrieved (DB error)',
          warning: 'Using mock data due to database error',
          data: { branch: mockBranch }
        },
        { status: 200, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('[Branch Detail API] Error in GET branch:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve branch', error: (error as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PUT /api/branches/[id] - Update branch by ID (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    console.log(`[Branch Detail API] PUT request for branch ID: ${params.id}`);
    
    // Validate branch ID
    const branchId = parseInt(params.id);
    if (isNaN(branchId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid branch ID' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Admin authorization check
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Check if user is admin
    if (!decoded.is_admin) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403, headers: corsHeaders }
      );
    }
    
    // Parse request body
    const body = await request.json();
    
    try {
      // Check database connection
      await models.sequelize.authenticate();
      
      // Find branch
      const branch = await models.Branch.findByPk(branchId);
      
      if (!branch) {
        return NextResponse.json(
          { success: false, message: 'Branch not found' },
          { status: 404, headers: corsHeaders }
        );
      }
      
      // Check if updating name and if it conflicts with existing branch
      if (body.name && body.name !== branch.get('name')) {
        const existingBranch = await models.Branch.findOne({
          where: { name: body.name }
        });
        
        if (existingBranch) {
          return NextResponse.json(
            { success: false, message: 'Branch with this name already exists' },
            { status: 409, headers: corsHeaders }
          );
        }
      }
      
      // Update branch
      await branch.update({
        name: body.name || branch.get('name'),
        address: body.address || branch.get('address'),
        contact: body.contact !== undefined ? body.contact : branch.get('contact'),
        email: body.email !== undefined ? body.email : branch.get('email'),
        is_active: body.is_active !== undefined ? body.is_active : branch.get('is_active'),
        opening_time: body.opening_time || branch.get('opening_time'),
        closing_time: body.closing_time || branch.get('closing_time')
      });
      
      return NextResponse.json(
        { 
          success: true, 
          message: 'Branch updated successfully',
          data: { branch }
        },
        { status: 200, headers: corsHeaders }
      );
      
    } catch (dbError) {
      console.error('[Branch Detail API] Database error updating branch:', dbError);
      return NextResponse.json(
        { success: false, message: 'Failed to update branch', error: (dbError as Error).message },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('[Branch Detail API] Error in PUT branch:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update branch', error: (error as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * DELETE /api/branches/[id] - Delete branch by ID (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    console.log(`[Branch Detail API] DELETE request for branch ID: ${params.id}`);
    
    // Validate branch ID
    const branchId = parseInt(params.id);
    if (isNaN(branchId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid branch ID' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Admin authorization check
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Check if user is admin
    if (!decoded.is_admin) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403, headers: corsHeaders }
      );
    }
    
    try {
      // Check database connection
      await models.sequelize.authenticate();
      
      // Find branch
      const branch = await models.Branch.findByPk(branchId);
      
      if (!branch) {
        return NextResponse.json(
          { success: false, message: 'Branch not found' },
          { status: 404, headers: corsHeaders }
        );
      }
      
      // Check if branch has associated seats or bookings
      const seatsCount = await models.Seat.count({ where: { branch_id: branchId } });
      const bookingsCount = await models.Booking.count({ where: { branch_id: branchId } });
      
      if (seatsCount > 0 || bookingsCount > 0) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Cannot delete branch with associated seats or bookings. Deactivate it instead.' 
          },
          { status: 409, headers: corsHeaders }
        );
      }
      
      // Delete branch
      await branch.destroy();
      
      return NextResponse.json(
        { success: true, message: 'Branch deleted successfully' },
        { status: 200, headers: corsHeaders }
      );
      
    } catch (dbError) {
      console.error('[Branch Detail API] Database error deleting branch:', dbError);
      return NextResponse.json(
        { success: false, message: 'Failed to delete branch', error: (dbError as Error).message },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('[Branch Detail API] Error in DELETE branch:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete branch', error: (error as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  });
}

/**
 * Generate a mock branch for the given ID
 */
function generateMockBranch(id: number) {
  // If ID is between 1-10, return a mock branch
  if (id >= 1 && id <= 10) {
    const isActive = id % 5 !== 0; // Make every 5th branch inactive for testing
    
    return {
      id,
      name: `Branch ${id}`,
      short_code: `BR${String(id).padStart(3, '0')}`,
      location: `Location ${id}`,
      address: `Address ${id}`,
      city: `City ${id % 5}`,
      state: `State ${id % 3}`,
      country: `Country ${id % 2}`,
      postal_code: `${10000 + id}`,
      phone: `+1-555-${1000 + id}`,
      email: `branch${id}@example.com`,
      is_active: isActive,
      created_at: new Date(Date.now() - id * 86400000),
      updated_at: new Date(Date.now() - id * 43200000)
    };
  }
  
  return null;
}
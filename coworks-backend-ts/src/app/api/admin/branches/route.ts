// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

// Explicitly set Node.js runtime for this route

// Explicitly set Node.js runtime for this route

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { Op } from 'sequelize';
import { verifyAdmin, verifyBranchAccess, verifySuperAdmin } from '@/utils/adminAuth';
import models from '@/models';
import { ApiResponse } from '@/types/api';
import { verifyJWT } from '@/utils/jwt';

// Mock data for branches
const branches = [
  { id: 'b1', name: 'Downtown Branch', code: 'DT001', location: 'City Center', capacity: 120 },
  { id: 'b2', name: 'Westside Branch', code: 'WS002', location: 'West Business Park', capacity: 85 },
  { id: 'b3', name: 'North Campus', code: 'NC003', location: 'North Tech Hub', capacity: 150 },
  { id: 'b4', name: 'East Village Office', code: 'EV004', location: 'East Village', capacity: 75 },
];

/**
 * GET /api/admin/branches - Get branches with pagination and filtering
 * Super Admin: Access to all branches
 * Branch Admin: Access only to their assigned branch
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { message: 'Unauthorized: No token provided' },
        { status: 401 }
      );
    }
    
    const decoded = await verifyJWT(token);
    
    if (!decoded) {
      return NextResponse.json(
        { message: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }
    
    // For super admin, return all branches
    // For branch admin, return only their assigned branch
    if (decoded.role === 'super_admin') {
      return NextResponse.json({ branches });
    } else {
      // In a real app, you would fetch branch based on decoded.branchId
      // For this mock, we'll return a filtered subset
      const branchId = 'b1'; // This would come from the decoded token in a real app
      const userBranches = branches.filter((branch) => branch.id === branchId);
      
      return NextResponse.json({ branches: userBranches });
    }
    
  } catch (error) {
    console.error('Error fetching branches:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
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
      address: location,
      short_code,
      is_active
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

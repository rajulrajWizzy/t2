// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/utils/jwt';
import { verifyAdmin } from '@/utils/adminAuth';

// Mock data for demonstration - replace with actual database queries
const adminUsers = [
  {
    id: '1',
    name: 'Super Admin',
    email: 'superadmin@example.com',
    role: 'super_admin',
    createdAt: '2023-01-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'Branch Admin 1',
    email: 'branchadmin1@example.com',
    role: 'branch_admin',
    branchId: 'b1',
    branchName: 'Downtown Branch',
    createdAt: '2023-02-20T14:30:00Z',
  },
  {
    id: '3',
    name: 'Branch Admin 2',
    email: 'branchadmin2@example.com',
    role: 'branch_admin',
    branchId: 'b2',
    branchName: 'Westside Branch',
    createdAt: '2023-03-10T09:15:00Z',
  }
];

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if ('status' in auth) {
      return auth as NextResponse;
    }
    
    // Verify authentication
    const token = request.headers.get('authorization')?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'No authentication token provided' 
          } 
        },
        { status: 401 }
      );
    }

    // Return list of admin users
    return NextResponse.json({ 
      success: true, 
      data: { 
        users: adminUsers 
      }, 
      message: 'Admin users retrieved successfully' 
    });
  } catch (error) {
    console.error('Error in GET /api/admin/users:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'SERVER_ERROR', 
          message: 'Failed to retrieve admin users' 
        } 
      },
      { status: 500 }
    );
  }
} 

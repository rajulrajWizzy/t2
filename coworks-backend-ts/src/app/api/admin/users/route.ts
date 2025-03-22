// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '../../../../utils/jwt';

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
    // Verify authentication
    const token = request.headers.get('authorization')?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { message: 'Unauthorized: No token provided' },
        { status: 401 }
      );
    }
    
    const decoded = await verifyJWT(token);
    
    if (!decoded || decoded.role !== 'super_admin') {
      return NextResponse.json(
        { message: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }
    
    // In a real application, you would fetch admin users from the database
    // For demonstration, we're using mock data
    
    return NextResponse.json({ admins: adminUsers });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 

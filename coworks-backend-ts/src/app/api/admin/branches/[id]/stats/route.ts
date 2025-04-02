// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/utils/jwt';
import { verifyAdmin, verifyBranchAccess } from '@/utils/adminAuth';
import models from '@/models';

// Mock data for branch stats
const mockBranchStats = {
  'b1': {
    totalBookings: 450,
    activeBookings: 102,
    pendingBookings: 45,
    openTickets: 15,
    totalSeats: 120,
    availability: 18,
    totalRevenue: 75000,
    seatsByType: [
      {
        typeId: 'hot-desk',
        typeName: 'Hot Desk',
        count: 48,
        available: 7
      },
      {
        typeId: 'dedicated-desk',
        typeName: 'Dedicated Desk',
        count: 36,
        available: 5
      },
      {
        typeId: 'private-office',
        typeName: 'Private Office',
        count: 24,
        available: 4
      },
      {
        typeId: 'meeting-room',
        typeName: 'Meeting Room',
        count: 12,
        available: 2
      }
    ],
    revenueHistory: [
      { month: 'Jan', revenue: 68000 },
      { month: 'Feb', revenue: 72000 },
      { month: 'Mar', revenue: 70000 },
      { month: 'Apr', revenue: 73000 },
      { month: 'May', revenue: 75000 },
      { month: 'Jun', revenue: 78000 }
    ],
    occupancyHistory: [
      { month: 'Jan', rate: 78 },
      { month: 'Feb', rate: 80 },
      { month: 'Mar', rate: 82 },
      { month: 'Apr', rate: 83 },
      { month: 'May', rate: 85 },
      { month: 'Jun', rate: 85 }
    ]
  },
  'b2': {
    totalBookings: 320,
    activeBookings: 78,
    pendingBookings: 32,
    openTickets: 12,
    totalSeats: 85,
    availability: 7,
    totalRevenue: 62000,
    seatsByType: [
      {
        typeId: 'hot-desk',
        typeName: 'Hot Desk',
        count: 34,
        available: 3
      },
      {
        typeId: 'dedicated-desk',
        typeName: 'Dedicated Desk',
        count: 25,
        available: 2
      },
      {
        typeId: 'private-office',
        typeName: 'Private Office',
        count: 17,
        available: 1
      },
      {
        typeId: 'meeting-room',
        typeName: 'Meeting Room',
        count: 9,
        available: 1
      }
    ],
    revenueHistory: [
      { month: 'Jan', revenue: 55000 },
      { month: 'Feb', revenue: 57000 },
      { month: 'Mar', revenue: 58000 },
      { month: 'Apr', revenue: 60000 },
      { month: 'May', revenue: 62000 },
      { month: 'Jun', revenue: 64000 }
    ],
    occupancyHistory: [
      { month: 'Jan', rate: 85 },
      { month: 'Feb', rate: 87 },
      { month: 'Mar', rate: 88 },
      { month: 'Apr', rate: 90 },
      { month: 'May', rate: 92 },
      { month: 'Jun', rate: 92 }
    ]
  },
  'b3': {
    totalBookings: 520,
    activeBookings: 117,
    pendingBookings: 52,
    openTickets: 18,
    totalSeats: 150,
    availability: 33,
    totalRevenue: 89000,
    seatsByType: [
      {
        typeId: 'hot-desk',
        typeName: 'Hot Desk',
        count: 60,
        available: 13
      },
      {
        typeId: 'dedicated-desk',
        typeName: 'Dedicated Desk',
        count: 45,
        available: 10
      },
      {
        typeId: 'private-office',
        typeName: 'Private Office',
        count: 30,
        available: 7
      },
      {
        typeId: 'meeting-room',
        typeName: 'Meeting Room',
        count: 15,
        available: 3
      }
    ],
    revenueHistory: [
      { month: 'Jan', revenue: 80000 },
      { month: 'Feb', revenue: 82000 },
      { month: 'Mar', revenue: 84000 },
      { month: 'Apr', revenue: 86000 },
      { month: 'May', revenue: 89000 },
      { month: 'Jun', revenue: 91000 }
    ],
    occupancyHistory: [
      { month: 'Jan', rate: 70 },
      { month: 'Feb', rate: 72 },
      { month: 'Mar', rate: 74 },
      { month: 'Apr', rate: 76 },
      { month: 'May', rate: 78 },
      { month: 'Jun', rate: 78 }
    ]
  },
  'b4': {
    totalBookings: 180,
    activeBookings: 0,
    pendingBookings: 0,
    openTickets: 0,
    totalSeats: 75,
    availability: 75,
    totalRevenue: 0,
    seatsByType: [
      {
        typeId: 'hot-desk',
        typeName: 'Hot Desk',
        count: 30,
        available: 30
      },
      {
        typeId: 'dedicated-desk',
        typeName: 'Dedicated Desk',
        count: 22,
        available: 22
      },
      {
        typeId: 'private-office',
        typeName: 'Private Office',
        count: 15,
        available: 15
      },
      {
        typeId: 'meeting-room',
        typeName: 'Meeting Room',
        count: 8,
        available: 8
      }
    ],
    revenueHistory: [
      { month: 'Jan', revenue: 45000 },
      { month: 'Feb', revenue: 48000 },
      { month: 'Mar', revenue: 50000 },
      { month: 'Apr', revenue: 30000 },
      { month: 'May', revenue: 0 },
      { month: 'Jun', revenue: 0 }
    ],
    occupancyHistory: [
      { month: 'Jan', rate: 65 },
      { month: 'Feb', rate: 68 },
      { month: 'Mar', rate: 70 },
      { month: 'Apr', rate: 40 },
      { month: 'May', rate: 0 },
      { month: 'Jun', rate: 0 }
    ]
  }
};

/**
 * GET /api/admin/branches/:id/stats - Get statistics for a specific branch
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const branchId = params.id;
    
    if (!branchId) {
      return NextResponse.json({
        success: false,
        message: 'Branch ID is required',
        data: null
      }, { status: 400 });
    }
    
    // Verify authentication
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
      
      if (!decoded) {
        return NextResponse.json({
          success: false,
          message: 'Unauthorized: Invalid token',
          data: null
        }, { status: 401 });
      }
      
      // Check if user has access to this branch
      if (decoded.role === 'branch_admin' && decoded.branchId !== branchId) {
        return NextResponse.json({
          success: false,
          message: 'Unauthorized: You do not have access to this branch',
          data: null
        }, { status: 403 });
      }
      
      // In a real implementation, you would fetch stats from database
      // For now, return mock data
      const stats = mockBranchStats[branchId];
      
      if (!stats) {
        return NextResponse.json({
          success: false,
          message: 'Branch not found or no statistics available',
          data: null
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Branch statistics retrieved successfully',
        data: stats
      });
    } catch (error) {
      console.error('JWT verification error:', error);
      
      // Return mock data with a warning for development/testing
      console.log('Returning mock branch stats due to auth error');
      const stats = mockBranchStats[branchId];
      
      if (!stats) {
        return NextResponse.json({
          success: false,
          message: 'Branch not found or no statistics available',
          data: null
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Using sample data due to authentication issues',
        data: {
          ...stats,
          warning: 'Authentication failed, showing sample data'
        }
      });
    }
  } catch (error) {
    console.error('Error fetching branch stats:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      data: null
    }, { status: 500 });
  }
}

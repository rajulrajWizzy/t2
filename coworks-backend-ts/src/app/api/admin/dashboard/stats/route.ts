import { verifyAdmin } from '@/utils/auth';
import { NextRequest, NextResponse } from 'next/server';
import db from '@/models';

export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    // Get admin role and branch_id (if applicable)
    const { role, branch_id } = admin;
    
    // Fetch different stats based on admin role
    if (role === 'branch_admin' && branch_id) {
      // Branch admin - fetch stats for their branch only
      const branchStats = await getBranchStats(branch_id);
      return NextResponse.json(branchStats);
    } else {
      // Super admin or general admin - fetch global stats
      const globalStats = await getGlobalStats();
      return NextResponse.json(globalStats);
    }
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}

// Function to get stats for a specific branch
async function getBranchStats(branchId: string) {
  // Get total bookings
  const totalBookings = await db.Booking.count({
    where: { branch_id: branchId }
  });

  // Get active bookings (status = active)
  const activeBookings = await db.Booking.count({
    where: { 
      branch_id: branchId,
      status: 'active'
    }
  });

  // Get pending bookings (status = pending)
  const pendingBookings = await db.Booking.count({
    where: { 
      branch_id: branchId,
      status: 'pending'
    }
  });

  // Get open support tickets
  const openTickets = await db.SupportTicket.count({
    where: { 
      branch_id: branchId,
      status: ['open', 'in_progress', 'assigned']
    }
  });

  // Get total revenue
  const payments = await db.Payment.findAll({
    where: {
      branch_id: branchId,
      status: 'completed'
    },
    attributes: [
      [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
    ],
    raw: true
  });
  
  const totalRevenue = payments[0]?.total || 0;

  return {
    totalBookings,
    activeBookings,
    pendingBookings,
    openTickets,
    totalRevenue
  };
}

// Function to get global stats for super admin
async function getGlobalStats() {
  // Get total bookings across all branches
  const totalBookings = await db.Booking.count();

  // Get active bookings across all branches
  const activeBookings = await db.Booking.count({
    where: { status: 'active' }
  });

  // Get pending bookings across all branches
  const pendingBookings = await db.Booking.count({
    where: { status: 'pending' }
  });

  // Get open support tickets across all branches
  const openTickets = await db.SupportTicket.count({
    where: { 
      status: ['open', 'in_progress', 'assigned']
    }
  });

  // Get total revenue across all branches
  const payments = await db.Payment.findAll({
    where: {
      status: 'completed'
    },
    attributes: [
      [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
    ],
    raw: true
  });
  
  const totalRevenue = payments[0]?.total || 0;

  // Get total branches
  const branches = await db.Branch.count();

  // Get total seats
  const seats = await db.Seat.count();

  return {
    totalBookings,
    activeBookings,
    pendingBookings,
    openTickets,
    totalRevenue,
    branches,
    seats
  };
} 
// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { verifySuperAdmin } from '@/utils/adminAuth';
import { NextRequest, NextResponse } from 'next/server';
import db from '@/models';
import { Op } from 'sequelize';

export async function GET(req: NextRequest) {
  try {
    // Verify super admin authentication
    const adminAuth = await verifySuperAdmin(req);
    if ('status' in adminAuth) {
      return adminAuth as NextResponse;
    }

    // Fetch super admin specific statistics
    const stats = await getSuperAdminStats();
    return NextResponse.json(stats);
    
  } catch (error) {
    console.error('Error fetching super admin statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch super admin statistics' },
      { status: 500 }
    );
  }
}

async function getSuperAdminStats() {
  // Get total branches
  const totalBranches = await db.Branch.count();
  
  // Get total seating types
  const totalSeatingTypes = await db.SeatingType.count();
  
  // Get total seats
  const totalSeats = await db.Seat.count();
  
  // Get total admin users
  const totalAdmins = await db.Admin.count();
  
  // Get total customers
  const totalCustomers = await db.Customer.count();
  
  // Get total revenue
  const revenueData = await db.Payment.findAll({
    where: {
      payment_status: 'completed'
    },
    attributes: [
      [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
    ],
    raw: true
  }) as unknown as { total: string }[];
  
  const totalRevenue = parseFloat(revenueData[0]?.total || '0');
  
  // Get branch performance metrics
  const branchPerformance = await db.Branch.findAll({
    attributes: [
      'id',
      'name',
      'short_code',
      [
        db.sequelize.literal(`(
          SELECT COUNT(*) FROM seats 
          WHERE seats.branch_id = "Branch".id
        )`),
        'total_seats'
      ],
      [
        db.sequelize.literal(`(
          SELECT COUNT(*) FROM seats 
          WHERE seats.branch_id = "Branch".id
          AND seats.availability_status = 'available'
        )`),
        'available_seats'
      ],
      [
        db.sequelize.literal(`(
          SELECT COUNT(*) FROM seat_bookings
          WHERE seat_bookings.seat_id IN (
            SELECT id FROM seats WHERE seats.branch_id = "Branch".id
          )
        )`),
        'total_bookings'
      ],
      [
        db.sequelize.literal(`(
          SELECT COALESCE(SUM(amount), 0) FROM payments
          WHERE payments.booking_id IN (
            SELECT id FROM seat_bookings
            WHERE seat_bookings.seat_id IN (
              SELECT id FROM seats WHERE seats.branch_id = "Branch".id
            )
          )
          AND payments.payment_status = 'completed'
        )`),
        'revenue'
      ]
    ],
    order: [
      [db.sequelize.literal('revenue'), 'DESC']
    ],
    raw: true
  });
  
  // Format branch performance data
  const formattedBranchPerformance = branchPerformance.map((branch: any) => ({
    id: branch.id,
    name: branch.name,
    code: branch.short_code,
    totalSeats: parseInt(branch.total_seats || '0'),
    availableSeats: parseInt(branch.available_seats || '0'),
    totalBookings: parseInt(branch.total_bookings || '0'),
    revenue: parseFloat(branch.revenue || '0'),
    occupancyRate: branch.total_seats > 0 
      ? Math.round(((branch.total_seats - branch.available_seats) / branch.total_seats) * 100) 
      : 0
  }));
  
  // Get current month's revenue
  const currentDate = new Date();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  const currentMonthRevenueData = await db.Payment.findAll({
    where: {
      payment_status: 'completed',
      created_at: {
        [Op.between]: [firstDayOfMonth, lastDayOfMonth]
      }
    },
    attributes: [
      [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
    ],
    raw: true
  }) as unknown as { total: string }[];
  
  const currentMonthRevenue = parseFloat(currentMonthRevenueData[0]?.total || '0');
  
  return {
    totalBranches,
    totalSeatingTypes,
    totalSeats,
    totalAdmins,
    totalCustomers,
    totalRevenue,
    currentMonthRevenue,
    branchPerformance: formattedBranchPerformance
  };
} 

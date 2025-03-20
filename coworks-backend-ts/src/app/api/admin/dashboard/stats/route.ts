import { verifyAdmin } from '@/utils/adminAuth';
import { NextRequest, NextResponse } from 'next/server';
import db from '@/models';
import { Op } from 'sequelize';

export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    const adminAuth = await verifyAdmin(req);
    if ('status' in adminAuth) {
      return adminAuth as NextResponse;
    }

    // Get admin role and branch_id (if applicable)
    const { role, branch_id } = adminAuth;
    
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
async function getBranchStats(branchId: string | number) {
  // First get seats for this branch
  const branchSeats = await db.Seat.findAll({
    where: { branch_id: branchId },
    attributes: ['id']
  });
  
  const seatIds = branchSeats.map((seat: any) => seat.id);
  
  // Get total bookings for this branch's seats
  const totalBookings = seatIds.length > 0 ? await db.SeatBooking.count({
    where: { 
      seat_id: { [Op.in]: seatIds }
    }
  }) : 0;

  // Get active bookings
  const activeBookings = seatIds.length > 0 ? await db.SeatBooking.count({
    where: { 
      seat_id: { [Op.in]: seatIds },
      status: 'active'
    }
  }) : 0;

  // Get pending bookings
  const pendingBookings = seatIds.length > 0 ? await db.SeatBooking.count({
    where: { 
      seat_id: { [Op.in]: seatIds },
      status: 'pending'
    }
  }) : 0;

  // Get open support tickets
  const openTickets = await db.SupportTicket.count({
    where: { 
      branch_id: branchId,
      status: { [Op.in]: ['open', 'in_progress', 'assigned'] }
    }
  });

  // Get total seats and available seats
  const totalSeats = await db.Seat.count({
    where: { branch_id: branchId }
  });
  
  const availableSeats = await db.Seat.count({
    where: { 
      branch_id: branchId,
      availability_status: 'available'
    }
  });

  // Get total revenue
  const payments = await db.Payment.findAll({
    where: {
      booking_id: { 
        [Op.in]: db.sequelize.literal(`
          SELECT id FROM seat_bookings 
          WHERE seat_id IN (
            SELECT id FROM seats WHERE branch_id = ${branchId}
          )
        `)
      },
      payment_status: 'completed'
    },
    attributes: [
      [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
    ],
    raw: true
  }) as unknown as { total: string }[];
  
  const totalRevenue = parseFloat(payments[0]?.total || '0');

  // Get seating types and counts
  const seatingTypes = await db.SeatingType.findAll({
    include: [{
      model: db.Seat,
      as: 'Seats',
      where: { branch_id: branchId },
      required: false
    }],
    attributes: [
      'id',
      'name',
      [db.sequelize.fn('COUNT', db.sequelize.col('Seats.id')), 'count'],
      [
        db.sequelize.fn(
          'SUM', 
          db.sequelize.literal(`CASE WHEN "Seats"."availability_status" = 'available' THEN 1 ELSE 0 END`)
        ), 
        'available'
      ]
    ],
    group: ['SeatingType.id'],
    raw: true,
    nest: true
  });

  const seatsByType = seatingTypes.map((type: any) => ({
    typeId: type.id,
    typeName: type.name,
    count: parseInt(type.count || '0'),
    available: parseInt(type.available || '0')
  }));

  return {
    totalBookings,
    activeBookings,
    pendingBookings,
    openTickets,
    totalRevenue,
    totalSeats,
    availability: availableSeats,
    seatsByType
  };
}

// Function to get global stats for super admin
async function getGlobalStats() {
  // Get total bookings across all branches
  const totalBookings = await db.SeatBooking.count();

  // Get active bookings across all branches
  const activeBookings = await db.SeatBooking.count({
    where: { status: 'active' }
  });

  // Get pending bookings across all branches
  const pendingBookings = await db.SeatBooking.count({
    where: { status: 'pending' }
  });

  // Get open support tickets across all branches
  const openTickets = await db.SupportTicket.count({
    where: { 
      status: { [Op.in]: ['open', 'in_progress', 'assigned'] }
    }
  });

  // Get total revenue across all branches
  const payments = await db.Payment.findAll({
    where: {
      payment_status: 'completed'
    },
    attributes: [
      [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
    ],
    raw: true
  }) as unknown as { total: string }[];
  
  const totalRevenue = parseFloat(payments[0]?.total || '0');

  // Get total branches
  const branches = await db.Branch.count();

  // Get total seats
  const seats = await db.Seat.count();
  
  // Get available seats
  const availableSeats = await db.Seat.count({
    where: { availability_status: 'available' }
  });

  return {
    totalBookings,
    activeBookings,
    pendingBookings,
    openTickets,
    totalRevenue,
    branches,
    seats,
    availableSeats
  };
}
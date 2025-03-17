import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/middleware/adminAuth';
import models from '@/models';
import { Op } from 'sequelize';

/**
 * GET dashboard metrics for admin
 * Returns metrics about bookings, seats, and revenue
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin authentication
    const authResponse = await verifyAdminToken(request);
    if (authResponse) return authResponse;

    // Get URL parameters
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate') || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString();
    const endDate = url.searchParams.get('endDate') || new Date().toISOString();
    
    // Calculate dashboard metrics
    const [
      totalSeats,
      totalBranches,
      totalCustomers,
      bookingMetrics,
      seatingTypeMetrics
    ] = await Promise.all([
      // Count total seats
      models.Seat.count(),
      
      // Count total branches
      models.Branch.count(),
      
      // Count total customers
      models.Customer.count(),
      
      // Get booking metrics
      getBookingMetrics(startDate, endDate),
      
      // Get seating type metrics
      getSeatingTypeMetrics()
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        totalSeats,
        totalBranches,
        totalCustomers,
        bookingMetrics,
        seatingTypeMetrics
      }
    });
  } catch (error) {
    console.error('Error fetching admin dashboard metrics:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch dashboard metrics',
      error: (error as Error).message
    }, { status: 500 });
  }
}

/**
 * Get booking metrics including counts and revenue
 */
async function getBookingMetrics(startDate: string, endDate: string) {
  const dateFilter = {
    [Op.between]: [new Date(startDate), new Date(endDate)]
  };
  
  // Get seat booking metrics
  const seatBookings = await models.SeatBooking.findAll({
    where: {
      start_time: dateFilter
    },
    attributes: [
      [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count'],
      [models.sequelize.fn('SUM', models.sequelize.col('total_price')), 'revenue']
    ],
    raw: true
  });
  
  // Get meeting room booking metrics
  const meetingBookings = await models.MeetingBooking.findAll({
    where: {
      start_time: dateFilter
    },
    attributes: [
      [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count'],
      [models.sequelize.fn('SUM', models.sequelize.col('total_price')), 'revenue']
    ],
    raw: true
  });
  
  // Calculate totals
  const totalBookings = (Number(seatBookings[0]?.count) || 0) + (Number(meetingBookings[0]?.count) || 0);
  const totalRevenue = (Number(seatBookings[0]?.revenue) || 0) + (Number(meetingBookings[0]?.revenue) || 0);
  
  return {
    totalBookings,
    totalRevenue,
    seatBookings: {
      count: Number(seatBookings[0]?.count) || 0,
      revenue: Number(seatBookings[0]?.revenue) || 0
    },
    meetingBookings: {
      count: Number(meetingBookings[0]?.count) || 0,
      revenue: Number(meetingBookings[0]?.revenue) || 0
    }
  };
}

/**
 * Get metrics for each seating type
 */
async function getSeatingTypeMetrics() {
  // Get all seating types
  const seatingTypes = await models.SeatingType.findAll({
    attributes: ['id', 'name', 'short_code']
  });
  
  // Get metrics for each seating type
  const seatingTypeMetrics = await Promise.all(
    seatingTypes.map(async (seatingType: any) => {
      // Count seats of this type
      const seatCount = await models.Seat.count({
        where: { seating_type_id: seatingType.id }
      });
      
      // Count bookings for this seating type
      const bookingCount = await models.SeatBooking.count({
        include: [{
          model: models.Seat,
          as: 'Seat',
          where: { seating_type_id: seatingType.id }
        }]
      });
      
      // Calculate revenue for this seating type
      const bookingRevenue = await models.SeatBooking.sum('total_price', {
        include: [{
          model: models.Seat,
          as: 'Seat',
          where: { seating_type_id: seatingType.id }
        }]
      });
      
      return {
        id: seatingType.id,
        name: seatingType.name,
        shortCode: seatingType.short_code,
        seatCount,
        bookingCount,
        revenue: bookingRevenue || 0
      };
    })
  );
  
  return seatingTypeMetrics;
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/config/jwt';
import models, { sequelize } from '@/models';
import { UserRole } from '@/types/auth';
import { BookingMetrics, DashboardResponse } from '@/types/common';
import { Op, WhereOptions } from 'sequelize';
import { Seat } from '@/types/seating';

/**
 * GET dashboard metrics for admin
 * Returns metrics about bookings, seats, and revenue
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Verify token
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      return new NextResponse(JSON.stringify({ message: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    if (decoded.role !== UserRole.SUPER_ADMIN && decoded.role !== UserRole.BRANCH_ADMIN) {
      return new NextResponse(JSON.stringify({ message: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Prepare branch condition based on role
    const branchCondition: WhereOptions<Seat> = decoded.role === UserRole.BRANCH_ADMIN && decoded.managed_branch_id ? 
      { branch_id: { [Op.eq]: decoded.managed_branch_id } } : {};

    // Get seat bookings metrics (excluding meeting rooms)
    const seatBookingsMetrics = await models.SeatBooking.findOne({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'booking_count'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = \'ACTIVE\' THEN 1 END')), 'active_count'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = \'PENDING\' THEN 1 END')), 'pending_count'],
        [sequelize.fn('SUM', sequelize.col('price')), 'total_price'],
      ],
      include: [
        {
          model: models.Seat,
          as: 'seat',
          attributes: [],
          where: branchCondition,
          required: true,
        },
      ],
    });

    // Get daily, weekly and monthly metrics
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59);

    // Daily bookings
    const dailyBookings = await models.SeatBooking.count({
      include: [
        {
          model: models.Seat,
          as: 'seat',
          attributes: [],
          where: branchCondition,
          required: true,
        },
      ],
      where: {
        createdAt: {
          [Op.between]: [startOfDay, endOfDay],
        },
      },
    });

    // Weekly bookings
    const weeklyBookings = await models.SeatBooking.count({
      include: [
        {
          model: models.Seat,
          as: 'seat',
          attributes: [],
          where: branchCondition,
          required: true,
        },
      ],
      where: {
        createdAt: {
          [Op.between]: [startOfWeek, endOfWeek],
        },
      },
    });

    // Monthly bookings
    const monthlyBookings = await models.SeatBooking.count({
      include: [
        {
          model: models.Seat,
          as: 'seat',
          attributes: [],
          where: branchCondition,
          required: true,
        },
      ],
      where: {
        createdAt: {
          [Op.between]: [startOfMonth, endOfMonth],
        },
      },
    });

    // Get total customers count
    const totalCustomers = await models.Customer.count({
      ...(decoded.role === UserRole.BRANCH_ADMIN && decoded.managed_branch_id ? {
        include: [
          {
            model: models.SeatBooking,
            as: 'bookings',
            required: true,
            include: [
              {
                model: models.Seat,
                as: 'seat',
                required: true,
                where: {
                  branch_id: decoded.managed_branch_id,
                },
              },
            ],
          },
        ],
      } : {}),
    });

    // Get available seats count and total seats count
    const seatsData = await models.Seat.findAll({
      attributes: [
        [sequelize.literal('COUNT(DISTINCT id)'), 'total_count'],
        [sequelize.literal('COUNT(DISTINCT CASE WHEN "Seat"."status" = \'AVAILABLE\' THEN "Seat"."id" END)'), 'available_count'],
      ],
      where: branchCondition,
      raw: true,
    });

    // Calculate occupancy rate
    const totalSeats = parseInt(seatsData[0].total_count as string, 10) || 0;
    const availableSeats = parseInt(seatsData[0].available_count as string, 10) || 0;
    const occupiedSeats = totalSeats - availableSeats;
    const occupancyRate = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;

    // Get additional chart data for visualizations
    // Monthly revenue data (for the past 12 months)
    const revenueData = await generateMonthlyRevenueData(branchCondition, decoded);

    // Weekly booking trends data
    const bookingTrendsData = await generateBookingTrendsData(branchCondition);

    // Customer distribution by plan type
    const customerDistributionData = await generateCustomerDistributionData(decoded);

    // Get top branches data (for super admin only)
    let topBranches = [];
    if (decoded.role === UserRole.SUPER_ADMIN) {
      topBranches = await models.Branch.findAll({
        attributes: [
          'id',
          'name',
          [sequelize.literal('(SELECT COUNT(*) FROM "SeatBookings" sb JOIN "Seats" s ON sb.seat_id = s.id WHERE s.branch_id = "Branch".id)'), 'booking_count'],
          [sequelize.literal('(SELECT COALESCE(SUM(price), 0) FROM "SeatBookings" sb JOIN "Seats" s ON sb.seat_id = s.id WHERE s.branch_id = "Branch".id)'), 'revenue'],
        ],
        order: [
          [sequelize.literal('revenue'), 'DESC'],
        ],
        limit: 5,
        raw: true,
      });

      topBranches = topBranches.map((branch: any) => ({
        id: branch.id,
        name: branch.name,
        bookings: parseInt(branch.booking_count, 10),
        revenue: parseFloat(branch.revenue),
      }));
    }

    const response: DashboardResponse = {
      success: true,
      data: {
        activeBookings: parseInt(seatBookingsMetrics?.getDataValue('active_count') as string, 10) || 0,
        pendingBookings: parseInt(seatBookingsMetrics?.getDataValue('pending_count') as string, 10) || 0,
        totalUsers: totalCustomers,
        currentMonthRevenue: parseFloat(seatBookingsMetrics?.getDataValue('total_price') as string) || 0,
        bookingsMetrics: {
          daily: dailyBookings,
          weekly: weeklyBookings,
          monthly: monthlyBookings,
        },
        availableSeats,
        occupancyRate,
        ...(topBranches.length > 0 && { topBranches }),
        revenueData,
        bookingTrends: bookingTrendsData,
        customerDistribution: customerDistributionData,
      },
    };

    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in dashboard route:', error);
    return new NextResponse(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Helper function to generate monthly revenue data for the past 12 months
async function generateMonthlyRevenueData(branchCondition: WhereOptions<Seat>, decoded: any) {
  const months = [];
  const values = [];
  const today = new Date();
  
  // Get the past 12 months
  for (let i = 11; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const month = date.toLocaleString('default', { month: 'short' });
    months.push(month);
    
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
    
    // Query the revenue for this month
    const monthlyRevenue = await models.SeatBooking.sum('price', {
      include: [
        {
          model: models.Seat,
          as: 'seat',
          attributes: [],
          where: branchCondition,
          required: true,
        },
      ],
      where: {
        createdAt: {
          [Op.between]: [startOfMonth, endOfMonth],
        },
      },
    });
    
    values.push(monthlyRevenue || 0);
  }
  
  return { labels: months, values };
}

// Helper function to generate booking trends data for the week
async function generateBookingTrendsData(branchCondition: WhereOptions<Seat>) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const shortDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const values = [];
  const today = new Date();
  const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
  
  // Start from the most recent Monday
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
  startOfWeek.setHours(0, 0, 0, 0);
  
  // For each day of the week
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startOfWeek);
    currentDate.setDate(startOfWeek.getDate() + i);
    const nextDate = new Date(currentDate);
    nextDate.setDate(currentDate.getDate() + 1);
    
    // Query the booking count for this day
    const dailyBookings = await models.SeatBooking.count({
      include: [
        {
          model: models.Seat,
          as: 'seat',
          attributes: [],
          where: branchCondition,
          required: true,
        },
      ],
      where: {
        createdAt: {
          [Op.between]: [currentDate, nextDate],
        },
      },
    });
    
    values.push(dailyBookings || 0);
  }
  
  return { labels: shortDays, values };
}

// Helper function to generate customer distribution data
async function generateCustomerDistributionData(decoded: any) {
  const planTypes = ['Basic', 'Standard', 'Premium', 'Enterprise'];
  let values = [0, 0, 0, 0];
  
  try {
    // In a real application, this would be based on actual plan types in the database
    // This is a mock implementation
    if (decoded.role === UserRole.BRANCH_ADMIN && decoded.managed_branch_id) {
      // For branch admin, get distribution for their specific branch
      const branchId = decoded.managed_branch_id;
      const totalCustomers = await models.Customer.count({
        include: [
          {
            model: models.SeatBooking,
            as: 'bookings',
            required: true,
            include: [
              {
                model: models.Seat,
                as: 'seat',
                required: true,
                where: {
                  branch_id: branchId,
                },
              },
            ],
          },
        ],
      });
      
      // Mock distribution - in a real app, we would query the actual distribution
      values = [
        Math.round(totalCustomers * 0.4), // 40% Basic
        Math.round(totalCustomers * 0.3), // 30% Standard
        Math.round(totalCustomers * 0.2), // 20% Premium
        Math.round(totalCustomers * 0.1), // 10% Enterprise
      ];
    } else {
      // For super admin, get overall distribution
      const totalCustomers = await models.Customer.count();
      values = [
        Math.round(totalCustomers * 0.35), // 35% Basic
        Math.round(totalCustomers * 0.25), // 25% Standard
        Math.round(totalCustomers * 0.25), // 25% Premium
        Math.round(totalCustomers * 0.15), // 15% Enterprise
      ];
    }
    
    return { labels: planTypes, values };
  } catch (error) {
    console.error('Error generating customer distribution:', error);
    return { labels: planTypes, values: [0, 0, 0, 0] };
  }
}

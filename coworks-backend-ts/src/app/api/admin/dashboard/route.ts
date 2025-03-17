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
        [sequelize.fn('SUM', sequelize.col('total_price')), 'total_revenue']
      ],
      include: [{
        model: models.Seat,
        as: 'Seat',
        attributes: [],
        include: [{
          model: models.SeatingType,
          as: 'SeatingType',
          where: {
            name: {
              [Op.ne]: 'MEETING_ROOM'
            }
          },
          required: true
        }],
        where: branchCondition,
        required: true
      }],
      where: {
        start_time: {
          [Op.between]: [startOfMonth, endOfMonth]
        }
      },
      raw: true
    }) as unknown as BookingMetrics;

    // Get meeting room bookings metrics
    const meetingBookingsMetrics = await models.MeetingBooking.findOne({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'booking_count'],
        [sequelize.fn('SUM', sequelize.col('total_price')), 'total_revenue']
      ],
      include: [{
        model: models.Seat,
        as: 'MeetingRoom',
        attributes: [],
        include: [{
          model: models.SeatingType,
          as: 'SeatingType',
          where: {
            name: 'MEETING_ROOM'
          },
          required: true
        }],
        where: branchCondition,
        required: true
      }],
      where: {
        start_time: {
          [Op.between]: [startOfMonth, endOfMonth]
        }
      },
      raw: true
    }) as unknown as BookingMetrics;

    // Get total seats and occupied seats (excluding meeting rooms)
    const totalSeats = await models.Seat.count({
      include: [{
        model: models.SeatingType,
        as: 'SeatingType',
        where: {
          name: {
            [Op.ne]: 'MEETING_ROOM'
          }
        },
        required: true
      }],
      where: branchCondition
    });

    const occupiedSeats = await models.SeatBooking.count({
      include: [{
        model: models.Seat,
        as: 'Seat',
        include: [{
          model: models.SeatingType,
          as: 'SeatingType',
          where: {
            name: {
              [Op.ne]: 'MEETING_ROOM'
            }
          },
          required: true
        }],
        where: branchCondition,
        required: true
      }],
      where: {
        start_time: {
          [Op.lte]: currentDate
        },
        end_time: {
          [Op.gte]: currentDate
        }
      },
      distinct: true
    });

    // Get total customers
    const totalCustomers = await models.Customer.count({
      where: {
        role: UserRole.CUSTOMER,
        ...(decoded.role === UserRole.BRANCH_ADMIN && decoded.managed_branch_id ? {
          '$SeatBookings.Seat.branch_id$': decoded.managed_branch_id
        } : {})
      },
      include: [{
        model: models.SeatBooking,
        as: 'SeatBookings',
        required: true,
        include: [{
          model: models.Seat,
          as: 'Seat',
          required: true
        }]
      }],
      distinct: true
    });

    // Get seating type metrics
    const seatingTypeMetricsResults = await models.Seat.findAll({
      attributes: [
        [sequelize.col('SeatingType.name'), 'type'],
        [sequelize.fn('COUNT', sequelize.col('Seat.id')), 'count']
      ],
      include: [{
        model: models.SeatingType,
        as: 'SeatingType',
        attributes: [],
        required: true
      }],
      where: branchCondition,
      group: ['SeatingType.name'],
      raw: true
    });

    const seatingTypeMetrics = seatingTypeMetricsResults.reduce((acc: { [key: string]: number }, curr: any) => {
      acc[curr.type] = Number(curr.count);
      return acc;
    }, {});

    const response: DashboardResponse = {
      success: true,
      data: {
        totalBookings: 
          (Number(seatBookingsMetrics?.booking_count) || 0) + 
          (Number(meetingBookingsMetrics?.booking_count) || 0),
        totalRevenue: 
          (Number(seatBookingsMetrics?.total_revenue) || 0) + 
          (Number(meetingBookingsMetrics?.total_revenue) || 0),
        totalCustomers,
        totalSeats,
        occupiedSeats,
        seatBookings: {
          count: Number(seatBookingsMetrics?.booking_count) || 0,
          revenue: Number(seatBookingsMetrics?.total_revenue) || 0
        },
        meetingBookings: {
          count: Number(meetingBookingsMetrics?.booking_count) || 0,
          revenue: Number(meetingBookingsMetrics?.total_revenue) || 0
        },
        seatingTypeMetrics
      }
    };

    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return new NextResponse(JSON.stringify({ 
      success: false,
      message: 'Internal server error',
      data: null
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/utils/jwt';
import { verifyAdmin } from '@/utils/adminAuth';
import models from '@/models';
import { QueryTypes } from 'sequelize';

// Handler for GET requests (list bookings)
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status');
    const branchId = url.searchParams.get('branch_id');
    const customerId = url.searchParams.get('customer_id');
    const page = parseInt(url.searchParams.get('page') || '0');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    // Verify admin authentication
    const auth = await verifyAdmin(request);
    
    // Check if database is connected
    try {
      await models.sequelize.authenticate();
      console.log('Database connection is active for bookings list');
    } catch (dbConnectionError) {
      console.error('Database connection failed:', dbConnectionError);
      throw new Error('Database connection failed: ' + (dbConnectionError as Error).message);
    }
    
    // Build query conditions
    let conditions = '';
    const replacements: any = {};
    
    if (status) {
      conditions += ' AND b.status = :status';
      replacements.status = status;
    }
    
    if (branchId) {
      conditions += ' AND b.branch_id = :branchId';
      replacements.branchId = branchId;
    }
    
    if (customerId) {
      conditions += ' AND b.customer_id = :customerId';
      replacements.customerId = customerId;
    }
    
    if (searchQuery) {
      conditions += ' AND (c.name LIKE :search OR c.email LIKE :search OR s.name LIKE :search OR br.name LIKE :search)';
      replacements.search = `%${searchQuery}%`;
    }
    
    // Count total bookings
    const countResult = await models.sequelize.query(
      `SELECT COUNT(*) as total FROM excel_coworks_schema.bookings b
       LEFT JOIN excel_coworks_schema.users c ON b.customer_id = c.id
       LEFT JOIN excel_coworks_schema.seats s ON b.seat_id = s.id
       LEFT JOIN excel_coworks_schema.branches br ON b.branch_id = br.id
       WHERE 1=1 ${conditions}`,
      {
        replacements,
        type: QueryTypes.SELECT
      }
    );
    
    const total = countResult[0]?.total || 0;
    
    // Get bookings with pagination
    const bookings = await models.SeatBooking.findAll({
      where: conditions,
      include: [
        {
          model: models.Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email']
        },
        {
          model: models.Seat,
          as: 'seat',
          include: [
            {
              model: models.SeatingType,
              as: 'seating_type'
            },
            {
              model: models.Branch,
              as: 'branch'
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset: page * limit
    });

    // Format bookings for response
    const formattedBookings = bookings.map(booking => {
      const bookingData = booking.get({ plain: true });
      const now = new Date();
      const startTime = new Date(bookingData.start_time);
      const endTime = new Date(bookingData.end_time);
      
      const calculatedStatus = 
        bookingData.status === BookingStatusEnum.CONFIRMED
          ? endTime < now
            ? BookingStatusEnum.COMPLETED
            : BookingStatusEnum.CONFIRMED
          : bookingData.status;

      return {
        id: bookingData.id,
        customer: bookingData.customer,
        seat: bookingData.seat,
        start_time: bookingData.start_time,
        end_time: bookingData.end_time,
        total_price: bookingData.total_price,
        status: calculatedStatus,
        is_active: calculatedStatus === BookingStatusEnum.CONFIRMED && startTime <= now && endTime > now,
        is_upcoming: calculatedStatus === BookingStatusEnum.CONFIRMED && startTime > now,
        is_completed: calculatedStatus === BookingStatusEnum.COMPLETED || 
          (calculatedStatus === BookingStatusEnum.CONFIRMED && endTime <= now),
        is_cancelled: calculatedStatus === BookingStatusEnum.CANCELLED,
        created_at: bookingData.created_at,
        updated_at: bookingData.updated_at
      };
    });

    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Bookings retrieved successfully',
      data: formattedBookings,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error retrieving bookings:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve bookings: ' + (error as Error).message
    }, { status: 500 });
  }
}

import { BookingStatusEnum } from '@/types/booking';
import { SeatingTypeEnum, AvailabilityStatusEnum } from '@/types/seating';

// Handler for POST requests (create booking)
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const data = await request.json();
    const { 
      type = 'seat',
      seat_id,
      seat_code,
      customer_id,
      start_time,
      end_time,
      total_price,
      quantity = 1,
      seating_type_code
    } = data;
    
    // Validate booking type
    if (!['seat', 'meeting'].includes(type)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid booking type. Must be either "seat" or "meeting"'
      }, { status: 400 });
    }
    
    // Need either seat_id or seat_code
    if ((!seat_id || typeof seat_id !== 'number' || seat_id <= 0) && !seat_code) {
      return NextResponse.json({
        success: false,
        message: 'Valid seat ID or seat code is required'
      }, { status: 400 });
    }
    
    // Validate dates
    if (!start_time || !end_time) {
      return NextResponse.json({
        success: false,
        message: 'Start time and end time are required'
      }, { status: 400 });
    }
    
    // Verify admin authentication
    const auth = await verifyAdmin(request);
    
    // Check if database is connected
    try {
      await models.sequelize.authenticate();
      console.log('Database connection is active for booking creation');
    } catch (dbConnectionError) {
      console.error('Database connection failed:', dbConnectionError);
      throw new Error('Database connection failed: ' + (dbConnectionError as Error).message);
    }
    
    // Get seat information
    let seat;
    if (seat_id) {
      seat = await models.Seat.findByPk(seat_id, {
        include: [{
          model: models.SeatingType,
          as: 'seating_type'
        }]
      });
    } else if (seat_code) {
      seat = await models.Seat.findOne({
        where: { seat_code },
        include: [{
          model: models.SeatingType,
          as: 'seating_type'
        }]
      });
    }

    if (!seat) {
      return NextResponse.json({
        success: false,
        message: 'Seat not found'
      }, { status: 404 });
    }

    // Check if customer exists
    const customer = await models.Customer.findByPk(customer_id);
    if (!customer) {
      return NextResponse.json({
        success: false,
        message: 'Customer not found'
      }, { status: 404 });
    }

    // Verify seat availability
    if (seat.availability_status !== AvailabilityStatusEnum.AVAILABLE) {
      return NextResponse.json({
        success: false,
        message: 'Selected seat is not available'
      }, { status: 400 });
    }
    
    // Create booking based on type
    let booking;
    if (type === 'seat') {
      booking = await models.SeatBooking.create({
        customer_id,
        seat_id: seat.id,
        start_time,
        end_time,
        total_price,
        status: BookingStatusEnum.CONFIRMED
      });

      // Update seat availability
      await seat.update({ availability_status: AvailabilityStatusEnum.BOOKED });
    } else {
      // Meeting room booking
      booking = await models.MeetingBooking.create({
        customer_id,
        meeting_room_id: seat.id,
        start_time,
        end_time,
        num_participants: quantity,
        total_price,
        status: BookingStatusEnum.CONFIRMED
      });

      // Update meeting room availability
      await seat.update({ availability_status: AvailabilityStatusEnum.BOOKED });
    }

    // Get full booking details
    const fullBooking = await models[type === 'seat' ? 'SeatBooking' : 'MeetingBooking'].findByPk(
      booking.id,
      {
        include: [
          {
            model: models.Customer,
            as: 'customer',
            attributes: ['id', 'name', 'email']
          },
          {
            model: models.Seat,
            as: type === 'seat' ? 'seat' : 'meeting_room',
            include: [
              {
                model: models.SeatingType,
                as: 'seating_type'
              },
              {
                model: models.Branch,
                as: 'branch'
              }
            ]
          }
        ]
      }
    );
    
    // Get the created booking
    const newBooking = await models.sequelize.query(
      `SELECT b.*, 
       c.name as customer_name, c.email as customer_email,
       s.name as seat_name, s.seat_number,
       st.name as seating_type, 
       br.name as branch_name
       FROM excel_coworks_schema.bookings b
       LEFT JOIN excel_coworks_schema.users c ON b.customer_id = c.id
       LEFT JOIN excel_coworks_schema.seats s ON b.seat_id = s.id
       LEFT JOIN excel_coworks_schema.seating_types st ON s.seating_type_id = st.id
       LEFT JOIN excel_coworks_schema.branches br ON b.branch_id = br.id
       WHERE b.id = :bookingId`,
      {
        replacements: { bookingId },
        type: QueryTypes.SELECT
      }
    );
    
    // Format booking for response
    const formattedBooking = newBooking[0] ? {
      id: newBooking[0].id,
      customer_id: newBooking[0].customer_id,
      customer_name: newBooking[0].customer_name,
      seat_id: newBooking[0].seat_id,
      seat_name: newBooking[0].seat_name || 'Unknown Seat',
      seating_type: newBooking[0].seating_type || 'Unknown Type',
      branch_id: newBooking[0].branch_id,
      branch_name: newBooking[0].branch_name || 'Unknown Branch',
      start_date: newBooking[0].start_date,
      end_date: newBooking[0].end_date,
      status: newBooking[0].status,
      amount: newBooking[0].amount,
      payment_status: newBooking[0].payment_status,
      created_at: newBooking[0].created_at,
      updated_at: newBooking[0].updated_at
    } : null;
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Booking created successfully',
      data: formattedBooking
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to create booking: ' + (error as Error).message
    }, { status: 500 });
  }
}

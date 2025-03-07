import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyToken } from '@/config/jwt';
import { Op } from 'sequelize';
import { AvailabilityStatusEnum } from '@/types/seating';

// GET bookings for a customer
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get URL parameters
    const url = new URL(request.url);
    const customer_id = url.searchParams.get('customer_id') || decoded.id.toString();
    const status = url.searchParams.get('status');
    const date_from = url.searchParams.get('date_from');
    const date_to = url.searchParams.get('date_to');
    
    // Prepare filter conditions
    const whereConditions: any = {};
    
    // Filter by customer_id
    whereConditions.customer_id = parseInt(customer_id);
    
    // Filter by status if provided
    if (status) {
      whereConditions.status = status;
    }
    
    // Filter by date range if provided
    if (date_from || date_to) {
      whereConditions.start_time = {};
      
      if (date_from) {
        whereConditions.start_time[Op.gte] = new Date(date_from);
      }
      
      if (date_to) {
        whereConditions.start_time[Op.lte] = new Date(date_to);
      }
    }
    
    // Find seat bookings
    const seatBookings = await models.SeatBooking.findAll({
      where: whereConditions,
      include: [
        {
          model: models.Seat,
          as: 'Seat', // Explicit alias
          include: [
            {
              model: models.Branch,
              as: 'Branch', // Explicit alias
              attributes: ['name', 'address', 'location']
            },
            {
              model: models.SeatingType,
              as: 'SeatingType', // Explicit alias
              attributes: ['name', 'description']
            }
          ]
        },
        {
          model: models.Customer,
          as: 'Customer', // Explicit alias
          attributes: ['name', 'email', 'phone']
        }
      ],
      order: [['start_time', 'DESC']]
    });
    
    // Find meeting bookings
    const meetingBookings = await models.MeetingBooking.findAll({
      where: whereConditions,
      include: [
        {
          model: models.Seat,
          as: 'MeetingRoom', // Explicit alias
          include: [
            {
              model: models.Branch,
              as: 'Branch', // Explicit alias
              attributes: ['name', 'address', 'location']
            },
            {
              model: models.SeatingType,
              as: 'SeatingType', // Explicit alias
              attributes: ['name', 'description']
            }
          ]
        },
        {
          model: models.Customer,
          as: 'Customer', // Explicit alias
          attributes: ['name', 'email', 'phone']
        }
      ],
      order: [['start_time', 'DESC']]
    });
    
    return NextResponse.json({
      success: true,
      data: {
        seatBookings,
        meetingBookings
      }
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch bookings',
      error: (error as Error).message
    }, { status: 500 });
  }
}

// POST create a new booking
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse the request body
    const body = await request.json();
    const { 
      type = 'seat',
      seat_id, 
      start_time, 
      end_time, 
      total_price 
    } = body;
    
    // Use the decoded ID from JWT token
    const customer_id = decoded.id;
    
    console.log('Using customer ID:', customer_id);
    console.log('Decoded token info:', decoded);
    
    // Basic validation
    if (!seat_id || !start_time || !end_time || !total_price) {
      return NextResponse.json({
        success: false,
        message: 'Seat ID, start time, end time, and total price are required'
      }, { status: 400 });
    }
    
    // Check if the customer exists
    const customer = await models.Customer.findByPk(customer_id);
    if (!customer) {
      return NextResponse.json({
        success: false,
        message: 'Customer not found. Please register first.',
        debug: { customerId: customer_id }
      }, { status: 404 });
    }
    
    // Check if the seat exists
    const seat = await models.Seat.findByPk(seat_id);
    if (!seat) {
      return NextResponse.json({
        success: false,
        message: 'Seat not found'
      }, { status: 404 });
    }
    
    // Check if the seat is available
    if (seat.availability_status !== AvailabilityStatusEnum.AVAILABLE) {
      return NextResponse.json({
        success: false,
        message: 'Seat is not available'
      }, { status: 400 });
    }
    
    // Convert string dates to Date objects
    const startTimeDate = new Date(start_time);
    const endTimeDate = new Date(end_time);
    
    // Check if the time slot is available
    const existingBookings = await models.SeatBooking.findAll({
      where: {
        seat_id,
        [Op.or]: [
          {
            start_time: {
              [Op.lt]: endTimeDate
            },
            end_time: {
              [Op.gt]: startTimeDate
            }
          }
        ],
        status: {
          [Op.notIn]: ['CANCELLED', 'COMPLETED']
        }
      }
    });
    
    if (existingBookings.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'The selected time slot is not available'
      }, { status: 400 });
    }
    
    // Create the booking based on type
    let booking;
    
    if (type === 'seat') {
      booking = await models.SeatBooking.create({
        customer_id,
        seat_id,
        start_time: startTimeDate,
        end_time: endTimeDate,
        total_price
      });
    } else if (type === 'meeting') {
      // Additional fields for meeting booking
      const { num_participants, amenities } = body;
      
      if (!num_participants) {
        return NextResponse.json({
          success: false,
          message: 'Number of participants is required for meeting bookings'
        }, { status: 400 });
      }
      
      booking = await models.MeetingBooking.create({
        customer_id,
        meeting_room_id: seat_id,
        start_time: startTimeDate,
        end_time: endTimeDate,
        num_participants,
        amenities: amenities || null,
        total_price
      });
    }
    
    // Update the seat availability
    await seat.update({ availability_status: AvailabilityStatusEnum.BOOKED });
    
    // Update time slots if they exist
    if (booking) {
      await models.TimeSlot.update(
        { is_available: false, booking_id: booking.id },
        { 
          where: { 
            seat_id, 
            date: startTimeDate.toISOString().split('T')[0],
            start_time: startTimeDate.toTimeString().split(' ')[0],
            end_time: endTimeDate.toTimeString().split(' ')[0]
          } 
        }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Booking created successfully',
      data: booking
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to create booking',
      error: (error as Error).message
    }, { status: 500 });
  }
}
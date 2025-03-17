// src/app/api/bookings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyToken } from '@/config/jwt';
import { ApiResponse } from '@/types/common';
import { Op } from 'sequelize';
import { SeatingTypeEnum, AvailabilityStatusEnum } from '@/types/seating';
import { 
  getBranchFromShortCode, 
  getSeatingTypeFromShortCode,
  formatApiEndpoint
} from '@/utils/shortCodes';
import { parseUrlParams, addBranchShortCode, addSeatingTypeShortCode } from '@/utils/apiHelpers';

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
    const { valid, decoded } = await verifyToken(token);
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
      total_price,
      quantity = 1 // Added quantity parameter
    } = body;
    
    // Use the decoded ID from JWT token
    const customer_id = decoded.id;
    
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
    
    // Get the seating type
    const seatingType = await models.SeatingType.findByPk(seat.seating_type_id);
    if (!seatingType) {
      return NextResponse.json({
        success: false,
        message: 'Seating type not found'
      }, { status: 404 });
    }
    
    // Convert string dates to Date objects
    const startTimeDate = new Date(start_time);
    const endTimeDate = new Date(end_time);
    
    // Calculate booking duration in days or hours
    const durationMs = endTimeDate.getTime() - startTimeDate.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    const durationDays = durationHours / 24;
    
    // Validate minimum booking duration based on seating type
    if (seatingType.name === SeatingTypeEnum.HOT_DESK) {
      // Hot desk: minimum 2 months (60 days) and at least 1 seat
      if (durationDays < 60) {
        return NextResponse.json({
          success: false,
          message: 'Hot desk requires a minimum booking duration of 2 months'
        }, { status: 400 });
      }
      
      if (quantity < 1) {
        return NextResponse.json({
          success: false,
          message: 'Hot desk requires at least 1 seat'
        }, { status: 400 });
      }
    } 
    else if (seatingType.name === SeatingTypeEnum.DEDICATED_DESK) {
      // Dedicated desk: minimum 3 months (90 days) and at least 10 seats
      if (durationDays < 90) {
        return NextResponse.json({
          success: false,
          message: 'Dedicated desk requires a minimum booking duration of 3 months'
        }, { status: 400 });
      }
      
      if (quantity < 10) {
        return NextResponse.json({
          success: false,
          message: 'Dedicated desk requires a minimum of 10 seats'
        }, { status: 400 });
      }
    }
    else if (seatingType.name === SeatingTypeEnum.CUBICLE) {
      // Cubicle: minimum 3 months (90 days)
      if (durationDays < 90) {
        return NextResponse.json({
          success: false,
          message: 'Cubicle requires a minimum booking duration of 3 months'
        }, { status: 400 });
      }
    }
    else if (seatingType.name === SeatingTypeEnum.MEETING_ROOM) {
      // Meeting room: hourly basis with minimum 2 hours
      if (durationHours < 2) {
        return NextResponse.json({
          success: false,
          message: 'Meeting room requires a minimum booking duration of 2 hours'
        }, { status: 400 });
      }
    }
    else if (seatingType.name === SeatingTypeEnum.DAILY_PASS) {
      // Daily pass: minimum 1 day
      if (durationDays < 1) {
        return NextResponse.json({
          success: false,
          message: 'Daily pass requires a minimum booking duration of 1 day'
        }, { status: 400 });
      }
    }
    
    // For Hot Desk and Daily Pass, check seat availability
    if (seatingType.name === SeatingTypeEnum.HOT_DESK || 
        seatingType.name === SeatingTypeEnum.DAILY_PASS) {
      // Count available seats of this type in the branch
      const branchId = seat.branch_id;
      const availableSeats = await models.Seat.count({
        where: {
          branch_id: branchId,
          seating_type_id: seat.seating_type_id,
          availability_status: AvailabilityStatusEnum.AVAILABLE
        }
      });
      
      if (availableSeats < quantity) {
        return NextResponse.json({
          success: false,
          message: `Not enough seats available. Only ${availableSeats} ${seatingType.name.toLowerCase()} seats available.`
        }, { status: 400 });
      }
    }
    
    // Check if the seat is available
    if (seat.availability_status !== AvailabilityStatusEnum.AVAILABLE) {
      return NextResponse.json({
        success: false,
        message: 'Seat is not available'
      }, { status: 400 });
    }
    
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
    
    // For seat types that require multiple seats, we need to book multiple seats
    const bookings = [];
    
    // Create multiple bookings for multiple seats if needed
    const seatsToBook = quantity || 1;
    
    if (type === 'seat') {
      if (seatsToBook === 1) {
        // Single seat booking
        const booking = await models.SeatBooking.create({
          customer_id,
          seat_id,
          start_time: startTimeDate,
          end_time: endTimeDate,
          total_price
        });
        
        bookings.push(booking);
        
        // Update the seat availability
        await seat.update({ availability_status: AvailabilityStatusEnum.BOOKED });
        
        // Update time slots if they exist
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
      } else {
        // Multiple seat booking (for dedicated desk or bulk hot desk)
        // Find available seats of the same type in the same branch
        const availableSeats = await models.Seat.findAll({
          where: {
            branch_id: seat.branch_id,
            seating_type_id: seat.seating_type_id,
            availability_status: AvailabilityStatusEnum.AVAILABLE
          },
          limit: seatsToBook
        });
        
        if (availableSeats.length < seatsToBook) {
          return NextResponse.json({
            success: false,
            message: `Not enough seats available. Only ${availableSeats.length} seats available.`
          }, { status: 400 });
        }
        
        // Book all seats
        for (const seatToBook of availableSeats) {
          const booking = await models.SeatBooking.create({
            customer_id,
            seat_id: seatToBook.id,
            start_time: startTimeDate,
            end_time: endTimeDate,
            total_price: total_price / seatsToBook // Divide total price among seats
          });
          
          bookings.push(booking);
          
          // Update the seat availability
          await seatToBook.update({ availability_status: AvailabilityStatusEnum.BOOKED });
          
          // Update time slots if they exist
          await models.TimeSlot.update(
            { is_available: false, booking_id: booking.id },
            { 
              where: { 
                seat_id: seatToBook.id, 
                date: startTimeDate.toISOString().split('T')[0],
                start_time: startTimeDate.toTimeString().split(' ')[0],
                end_time: endTimeDate.toTimeString().split(' ')[0]
              } 
            }
          );
        }
      }
    } else if (type === 'meeting') {
      // Additional fields for meeting booking
      const { num_participants, amenities } = body;
      
      if (!num_participants) {
        return NextResponse.json({
          success: false,
          message: 'Number of participants is required for meeting bookings'
        }, { status: 400 });
      }
      
      const booking = await models.MeetingBooking.create({
        customer_id,
        meeting_room_id: seat_id,
        start_time: startTimeDate,
        end_time: endTimeDate,
        num_participants,
        amenities: amenities || null,
        total_price
      });
      
      bookings.push(booking);
      
      // Update the seat availability
      await seat.update({ availability_status: AvailabilityStatusEnum.BOOKED });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Booking created successfully',
      data: bookings.length === 1 ? bookings[0] : bookings
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

// GET bookings with optional filtering by branch and seating type short codes
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Unauthorized',
        data: null
      }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Invalid token',
        data: null
      }, { status: 401 });
    }

    // Extract query parameters
    const url = new URL(req.url);
    const branchCode = url.searchParams.get('branch');
    const seatingTypeCode = url.searchParams.get('type');

    // Prepare filter conditions
    const whereConditions: any = {};

    // Filter by branch if provided
    if (branchCode) {
      const branch = await models.Branch.findOne({
        where: { short_code: branchCode }
      });
      
      if (branch) {
        whereConditions.branch_id = branch.id;
      }
    }

    // Filter by seating type if provided
    if (seatingTypeCode) {
      const seatingType = await models.SeatingType.findOne({
        where: { short_code: seatingTypeCode }
      });
      
      if (seatingType) {
        whereConditions.seating_type_id = seatingType.id;
      }
    }

    // Fetch bookings with filters
    const bookings = await models.SeatBooking.findAll({
      where: whereConditions,
      include: [
        { model: models.Branch, as: 'Branch' },
        { model: models.Seat, as: 'Seat' },
        { model: models.Customer, as: 'Customer' }
      ]
    });

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: 'Bookings fetched successfully',
      data: bookings
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to fetch bookings',
      data: null
    }, { status: 500 });
  }
}

// Example of using formatApiEndpoint function
// Removed export to fix Next.js route error
function getBookingApiUrl(branch: string, seatingType: any): string {
  return `/api/bookings?branch=${branch}&type=${seatingType}`;
}
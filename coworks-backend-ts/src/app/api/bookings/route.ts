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
      quantity = 1,
      seating_type
    } = body;
    
    // Validate booking type
    if (!['seat', 'meeting'].includes(type)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid booking type. Must be either "seat" or "meeting"'
      }, { status: 400 });
    }
    
    // Validate seat_id
    if (!seat_id || typeof seat_id !== 'number' || seat_id <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Valid seat ID is required'
      }, { status: 400 });
    }
    
    // Validate seating type if provided
    if (seating_type) {
      const validSeatingTypes = ['hot', 'ded', 'cub', 'meet', 'day'];
      if (!validSeatingTypes.includes(seating_type)) {
        return NextResponse.json({
          success: false,
          message: 'Invalid seating type. Must be one of: hot (Hot Desk), ded (Dedicated Desk), cub (Cubicle), meet (Meeting Room), day (Daily Pass)'
        }, { status: 400 });
      }
    }
    
    // Validate dates
    if (!start_time || !end_time) {
      return NextResponse.json({
        success: false,
        message: 'Start time and end time are required'
      }, { status: 400 });
    }
    
    const startTimeDate = new Date(start_time);
    const endTimeDate = new Date(end_time);
    
    if (isNaN(startTimeDate.getTime()) || isNaN(endTimeDate.getTime())) {
      return NextResponse.json({
        success: false,
        message: 'Invalid date format'
      }, { status: 400 });
    }
    
    if (startTimeDate >= endTimeDate) {
      return NextResponse.json({
        success: false,
        message: 'End time must be after start time'
      }, { status: 400 });
    }
    
    // Validate total price
    if (!total_price || typeof total_price !== 'number' || total_price <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Valid total price is required'
      }, { status: 400 });
    }
    
    // Validate quantity
    if (typeof quantity !== 'number' || quantity < 1) {
      return NextResponse.json({
        success: false,
        message: 'Quantity must be at least 1'
      }, { status: 400 });
    }
    
    // Use the decoded ID from JWT token
    const customer_id = decoded.id;
    
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
    const seat = await models.Seat.findByPk(seat_id, {
      include: [
        {
          model: models.SeatingType,
          as: 'SeatingType',
          attributes: ['id', 'name', 'short_code', 'description']
        }
      ]
    });
    
    if (!seat) {
      return NextResponse.json({
        success: false,
        message: 'Seat not found'
      }, { status: 404 });
    }
    
    // Get the seating type
    const seatingType = seat.SeatingType;
    if (!seatingType) {
      return NextResponse.json({
        success: false,
        message: 'Seating type not found'
      }, { status: 404 });
    }
    
    // Validate seating type matches the request if provided
    if (seating_type && seatingType.short_code !== seating_type) {
      return NextResponse.json({
        success: false,
        message: `Seat #${seat_id} is not a ${seating_type} seat. It is a ${seatingType.short_code} seat.`,
        data: {
          seat_id: seat.id,
          seat_number: seat.seat_number,
          actual_seating_type: {
            name: seatingType.name,
            short_code: seatingType.short_code,
            description: seatingType.description
          }
        }
      }, { status: 400 });
    }
    
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
      
      if (!num_participants || typeof num_participants !== 'number' || num_participants < 1) {
        return NextResponse.json({
          success: false,
          message: 'Valid number of participants is required for meeting bookings'
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
    
    // Return seating type information in the response
    const response = {
      success: true,
      message: 'Seat found',
      data: {
        seat_id: seat.id,
        seat_number: seat.seat_number,
        seating_type: {
          id: seatingType.id,
          name: seatingType.name,
          short_code: seatingType.short_code,
          description: seatingType.description
        }
      }
    };
    
    // If this is a cubicle seat, add a note
    if (seatingType.short_code === 'cub') {
      response.message = 'Cubicle seat found';
    }
    
    return NextResponse.json(response);
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
    // Get token from the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Unauthorized',
        data: null
      }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
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
    const whereConditions: any = {
      customer_id: decoded.id // Only fetch bookings for the authenticated user
    };

    // Fetch seat bookings
    const seatBookings = await models.SeatBooking.findAll({
      where: whereConditions,
      include: [
        { 
          model: models.Seat, 
          as: 'Seat',
          include: [
            { 
              model: models.Branch, 
              as: 'Branch',
              where: branchCode ? { short_code: branchCode } : undefined,
              attributes: [
                'id', 'name', 'address', 'location', 'latitude', 'longitude',
                'cost_multiplier', 'opening_time', 'closing_time', 'is_active',
                'images', 'amenities', 'short_code'
              ]
            },
            { 
              model: models.SeatingType, 
              as: 'SeatingType',
              where: seatingTypeCode ? { short_code: seatingTypeCode } : undefined,
              attributes: [
                'id', 'name', 'description', 'hourly_rate', 'is_hourly',
                'min_booking_duration', 'min_seats', 'short_code'
              ]
            }
          ]
        },
        { 
          model: models.Customer, 
          as: 'Customer',
          attributes: ['id', 'name', 'email', 'phone', 'company_name']
        }
      ]
    }) as any[];

    // Fetch meeting bookings
    const meetingBookings = await models.MeetingBooking.findAll({
      where: whereConditions,
      include: [
        { 
          model: models.Seat, 
          as: 'MeetingRoom',
          include: [
            { 
              model: models.Branch, 
              as: 'Branch',
              where: branchCode ? { short_code: branchCode } : undefined,
              attributes: [
                'id', 'name', 'address', 'location', 'latitude', 'longitude',
                'cost_multiplier', 'opening_time', 'closing_time', 'is_active',
                'images', 'amenities', 'short_code'
              ]
            },
            { 
              model: models.SeatingType, 
              as: 'SeatingType',
              where: seatingTypeCode ? { short_code: seatingTypeCode } : undefined,
              attributes: [
                'id', 'name', 'description', 'hourly_rate', 'is_hourly',
                'min_booking_duration', 'min_seats', 'short_code'
              ]
            }
          ]
        },
        { 
          model: models.Customer, 
          as: 'Customer',
          attributes: ['id', 'name', 'email', 'phone', 'company_name']
        }
      ]
    }) as any[];

    // Filter out bookings where Seat/MeetingRoom is null (when filtering by seating type)
    const filteredSeatBookings = seatingTypeCode 
      ? seatBookings.filter(booking => booking.Seat !== null)
      : seatBookings;

    const filteredMeetingBookings = seatingTypeCode
      ? meetingBookings.filter(booking => booking.MeetingRoom !== null)
      : meetingBookings;

    // Combine both types of bookings and format the response
    const bookings = [...filteredSeatBookings, ...filteredMeetingBookings].map(booking => {
      const isSeatBooking = 'seat_id' in booking;
      const seatOrRoom = isSeatBooking ? booking.Seat : booking.MeetingRoom;
      
      return {
        id: booking.id,
        type: isSeatBooking ? 'seat' : 'meeting',
        customer_id: booking.customer_id,
        seat_id: isSeatBooking ? booking.seat_id : booking.meeting_room_id,
        start_time: booking.start_time,
        end_time: booking.end_time,
        total_price: booking.total_price,
        status: booking.status,
        created_at: booking.created_at,
        updated_at: booking.updated_at,
        seating_type: seatOrRoom?.SeatingType ? {
          id: seatOrRoom.SeatingType.id,
          name: seatOrRoom.SeatingType.name,
          short_code: seatOrRoom.SeatingType.short_code,
          description: seatOrRoom.SeatingType.description,
          hourly_rate: seatOrRoom.SeatingType.hourly_rate,
          is_hourly: seatOrRoom.SeatingType.is_hourly,
          min_booking_duration: seatOrRoom.SeatingType.min_booking_duration,
          min_seats: seatOrRoom.SeatingType.min_seats
        } : null,
        branch: seatOrRoom?.Branch ? {
          id: seatOrRoom.Branch.id,
          name: seatOrRoom.Branch.name,
          short_code: seatOrRoom.Branch.short_code,
          address: seatOrRoom.Branch.address,
          location: seatOrRoom.Branch.location,
          opening_time: seatOrRoom.Branch.opening_time,
          closing_time: seatOrRoom.Branch.closing_time,
          amenities: seatOrRoom.Branch.amenities,
          images: seatOrRoom.Branch.images
        } : null,
        customer: (booking as any).Customer ? {
          id: (booking as any).Customer.id,
          name: (booking as any).Customer.name,
          email: (booking as any).Customer.email,
          phone: (booking as any).Customer.phone,
          company_name: (booking as any).Customer.company_name
        } : null
      };
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
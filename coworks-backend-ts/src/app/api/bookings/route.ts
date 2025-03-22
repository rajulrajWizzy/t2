// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

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
import { BookingStatusEnum } from '@/types/booking';
import { verifyProfileComplete } from '../middleware/verifyProfileComplete';

// POST create a new booking
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
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
        message: 'Unauthorized',
        data: null
      }, { status: 401 });
    }
    
    // Verify profile is complete with required documents
    const profileVerificationResponse = await verifyProfileComplete(request);
    if (profileVerificationResponse) {
      return profileVerificationResponse;
    }
    
    // Parse the request body
    const body = await request.json();
    const { 
      type = 'seat',
      seat_id, 
      seat_code,
      start_time, 
      end_time, 
      total_price,
      quantity = 1,
      seating_type_code
    } = body;
    
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
    
    // Look up seat by ID or code
    let seatWhere = {};
    if (seat_id) {
      seatWhere = { id: seat_id };
    } else if (seat_code) {
      seatWhere = { seat_code: seat_code };
    }
    
    // Check if the seat exists
    const seat = await models.Seat.findOne({
      where: seatWhere,
      include: [
        {
          model: models.SeatingType,
          as: 'SeatingType',
          attributes: ['id', 'name', 'short_code', 'description', 'hourly_rate', 'is_hourly', 'min_booking_duration', 'min_seats', 'quantity_options', 'cost_multiplier']
        },
        {
          model: models.Branch,
          as: 'Branch',
          attributes: ['id', 'name', 'short_code', 'location', 'address']
        }
      ]
    }) as any;
    
    if (!seat) {
      return NextResponse.json({
        success: false,
        message: `Seat ${seat_id ? `#${seat_id}` : `with code ${seat_code}`} not found`
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
    if (seating_type_code && seatingType.short_code !== seating_type_code) {
      return NextResponse.json({
        success: false,
        message: `Seat ${seat_id ? `#${seat_id}` : seat_code} is not a ${seating_type_code} seat. It is a ${seatingType.short_code} seat.`,
        data: {
          seat_id: seat.id,
          seat_number: seat.seat_number,
          seat_code: seat.seat_code,
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
    const durationMonths = durationDays / 30; // Approximate
    
    // Validate minimum booking duration based on seating type
    if (seatingType.name === SeatingTypeEnum.HOT_DESK) {
      // Hot desk: minimum 1 month and at least 1 seat
      if (durationMonths < 1) {
        return NextResponse.json({
          success: false,
          message: 'Hot desk requires a minimum booking duration of 1 month'
        }, { status: 400 });
      }
      
      if (quantity < 1) {
        return NextResponse.json({
          success: false,
          message: 'Hot desk requires at least 1 seat'
        }, { status: 400 });
      }
      
      // Validate quantity against available quantity options
      if (seatingType.quantity_options && !seatingType.quantity_options.includes(quantity)) {
        return NextResponse.json({
          success: false,
          message: `Invalid quantity. Available options are: ${seatingType.quantity_options.join(', ')}`,
          data: {
            available_quantities: seatingType.quantity_options
          }
        }, { status: 400 });
      }
    } 
    else if (seatingType.name === SeatingTypeEnum.DEDICATED_DESK) {
      // Dedicated desk: minimum 1 month and at least 1 seat
      if (durationMonths < 1) {
        return NextResponse.json({
          success: false,
          message: 'Dedicated desk requires a minimum booking duration of 1 month'
        }, { status: 400 });
      }
      
      if (quantity < 1) {
        return NextResponse.json({
          success: false,
          message: 'Dedicated desk requires a minimum of 1 seat'
        }, { status: 400 });
      }
      
      // Validate quantity against available quantity options
      if (seatingType.quantity_options && !seatingType.quantity_options.includes(quantity)) {
        return NextResponse.json({
          success: false,
          message: `Invalid quantity. Available options are: ${seatingType.quantity_options.join(', ')}`,
          data: {
            available_quantities: seatingType.quantity_options
          }
        }, { status: 400 });
      }
    }
    else if (seatingType.name === SeatingTypeEnum.CUBICLE) {
      // Cubicle: minimum 1 month
      if (durationMonths < 1) {
        return NextResponse.json({
          success: false,
          message: 'Cubicle requires a minimum booking duration of 1 month'
        }, { status: 400 });
      }
    }
    else if (seatingType.name === SeatingTypeEnum.MEETING_ROOM) {
      // Meeting room: hourly basis with minimum 1 hour
      if (durationHours < 1) {
        return NextResponse.json({
          success: false,
          message: 'Meeting room requires a minimum booking duration of 1 hour'
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
    
    // For Hot Desk, Dedicated Desk and Daily Pass, check seat availability
    if (seatingType.name === SeatingTypeEnum.HOT_DESK || 
        seatingType.name === SeatingTypeEnum.DEDICATED_DESK ||
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
        seat_id: seat.id,
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
        message: 'The selected time slot is not available',
        conflicts: existingBookings.map(booking => ({
          start_time: booking.start_time,
          end_time: booking.end_time,
          status: booking.status
        }))
      }, { status: 400 });
    }
    
    // Apply cost multiplier based on quantity if applicable
    let adjustedTotalPrice = total_price;
    if (
      seatingType.cost_multiplier && 
      (seatingType.name === SeatingTypeEnum.HOT_DESK || seatingType.name === SeatingTypeEnum.DEDICATED_DESK) &&
      quantity > 1
    ) {
      const multiplierKey = quantity.toString();
      if (seatingType.cost_multiplier[multiplierKey]) {
        // Apply the multiplier to the total price
        const basePrice = total_price / quantity; // Get the price per seat
        adjustedTotalPrice = basePrice * quantity * seatingType.cost_multiplier[multiplierKey];
      }
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
          seat_id: seat.id,
          start_time: startTimeDate,
          end_time: endTimeDate,
          total_price: adjustedTotalPrice,
          status: BookingStatusEnum.CONFIRMED
        });
        
        bookings.push(booking);
        
        // Update the seat availability
        await seat.update({ availability_status: AvailabilityStatusEnum.BOOKED });
        
        // Update time slots if they exist
        await models.TimeSlot.update(
          { is_available: false, booking_id: booking.id },
          { 
            where: { 
              seat_id: seat.id, 
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
            total_price: adjustedTotalPrice / seatsToBook, // Divide total price among seats
            status: BookingStatusEnum.CONFIRMED
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
        meeting_room_id: seat.id,
        start_time: startTimeDate,
        end_time: endTimeDate,
        num_participants,
        amenities: amenities || null,
        total_price: adjustedTotalPrice,
        status: BookingStatusEnum.CONFIRMED
      });
      
      bookings.push(booking);
      
      // Update the seat availability
      await seat.update({ availability_status: AvailabilityStatusEnum.BOOKED });
    }
    
    // Return seating type information in the response
    const response = {
      success: true,
      message: `${seatingType.name} booking created successfully`,
      data: {
        bookings: bookings.map(booking => {
          const bookingData: any = {
            id: booking.id,
            start_time: booking.start_time,
            end_time: booking.end_time,
            total_price: booking.total_price,
            status: booking.status
          };
          
          if (type === 'seat' && 'seat_id' in booking) {
            bookingData.seat_id = booking.seat_id;
          } else if (type === 'meeting' && 'meeting_room_id' in booking) {
            bookingData.meeting_room_id = booking.meeting_room_id;
            bookingData.num_participants = booking.num_participants;
            bookingData.amenities = booking.amenities;
          }
          
          return bookingData;
        }),
        seat: {
          id: seat.id,
          seat_number: seat.seat_number,
          seat_code: seat.seat_code
        },
        seating_type: {
          id: seatingType.id,
          name: seatingType.name,
          short_code: seatingType.short_code,
          description: seatingType.description,
          quantity_options: seatingType.quantity_options,
          cost_multiplier: seatingType.cost_multiplier
        },
        branch: seat.Branch ? {
          id: seat.Branch.id,
          name: seat.Branch.name,
          short_code: seat.Branch.short_code,
          location: seat.Branch.location,
          address: seat.Branch.address
        } : null,
        booking_details: {
          type,
          quantity: seatsToBook,
          start_time: startTimeDate,
          end_time: endTimeDate,
          original_price: total_price,
          adjusted_price: adjustedTotalPrice,
          discount_applied: adjustedTotalPrice < total_price,
          duration: {
            hours: durationHours,
            days: durationDays,
            months: durationMonths
          },
          total_price: adjustedTotalPrice
        }
      }
    };
    
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
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Unauthorized',
        data: null
      }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { valid, decoded } = await verifyToken(token);
    
    if (!valid || !decoded) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Unauthorized',
        data: null
      }, { status: 401 });
    }
    
    // Verify profile is complete with required documents
    const profileVerificationResponse = await verifyProfileComplete(req);
    if (profileVerificationResponse) {
      return profileVerificationResponse;
    }
    
    // Extract query parameters
    const url = new URL(req.url);
    const branchCode = url.searchParams.get('branch');
    const seatingTypeCode = url.searchParams.get('type');
    const statusFilter = url.searchParams.get('status');
    const customerFilter = decoded.id; // Only fetch bookings for the authenticated user
    
    // Validate branch exists if branch code is provided
    if (branchCode) {
      const branch = await models.Branch.findOne({
        where: { short_code: branchCode },
        attributes: ['id']
      });

      if (!branch) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: `Branch with code ${branchCode} does not exist`,
          data: null
        }, { status: 404 });
      }
    }

    // Validate seating type exists if seating type code is provided
    let seatingTypeWhere: any = undefined;
    if (seatingTypeCode) {
      if (seatingTypeCode === 'hot') {
        // For "hot" seats specifically query by name instead of code
        seatingTypeWhere = { name: SeatingTypeEnum.HOT_DESK };
        
        // Verify that this seating type exists
        const hotDeskExists = await models.SeatingType.findOne({
          where: { name: SeatingTypeEnum.HOT_DESK },
          attributes: ['id']
        });
        
        if (!hotDeskExists) {
          return NextResponse.json<ApiResponse<null>>({
            success: false,
            message: `Seating type HOT_DESK does not exist`,
            data: null
          }, { status: 404 });
        }
      } else {
        seatingTypeWhere = { short_code: seatingTypeCode };
        
        // Verify that this seating type exists
        const seatingType = await models.SeatingType.findOne({
          where: { short_code: seatingTypeCode },
          attributes: ['id']
        });
        
        if (!seatingType) {
          return NextResponse.json<ApiResponse<null>>({
            success: false,
            message: `Seating type with code ${seatingTypeCode} does not exist`,
            data: null
          }, { status: 404 });
        }
      }
    }

    // Prepare filter conditions
    const whereConditions: any = {
      customer_id: customerFilter
    };
    
    // Add status filter
    if (statusFilter) {
      const now = new Date();
      
      switch (statusFilter.toLowerCase()) {
        case 'active':
          // Currently ongoing bookings
          whereConditions.status = BookingStatusEnum.CONFIRMED;
          whereConditions.start_time = { [Op.lte]: now };
          whereConditions.end_time = { [Op.gt]: now };
          break;
          
        case 'upcoming':
          // Future bookings that are confirmed
          whereConditions.status = BookingStatusEnum.CONFIRMED;
          whereConditions.start_time = { [Op.gt]: now };
          break;
          
        case 'cancelled':
          whereConditions.status = BookingStatusEnum.CANCELLED;
          break;
          
        case 'completed':
          // Either explicitly marked as COMPLETED or confirmed bookings with end time in the past
          whereConditions[Op.or] = [
            { status: BookingStatusEnum.COMPLETED },
            {
              status: BookingStatusEnum.CONFIRMED,
              end_time: { [Op.lt]: now }
            }
          ];
          break;
          
        default:
          // If invalid status is provided, don't apply any status filter
          break;
      }
    }

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
              where: seatingTypeWhere,
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
      ],
      order: [['start_time', 'DESC']]
    }) as any[];

    // Fetch meeting bookings with the same filters
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
              where: seatingTypeWhere,
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
      ],
      order: [['start_time', 'DESC']]
    }) as any[];

    // Filter out bookings where Seat/MeetingRoom is null (when filtering by seating type or branch)
    const filteredSeatBookings = seatBookings.filter(booking => booking.Seat !== null);
    const filteredMeetingBookings = meetingBookings.filter(booking => booking.MeetingRoom !== null);

    // Combine both types of bookings and format the response
    const bookings = [...filteredSeatBookings, ...filteredMeetingBookings].map(booking => {
      const isSeatBooking = 'seat_id' in booking;
      const seatOrRoom = isSeatBooking ? booking.Seat : booking.MeetingRoom;
      
      // Determine booking status based on time if not explicitly completed or cancelled
      let calculatedStatus = booking.status;
      
      if (booking.status === BookingStatusEnum.CONFIRMED) {
        const now = new Date();
        const startTime = new Date(booking.start_time);
        const endTime = new Date(booking.end_time);
        
        if (endTime < now) {
          calculatedStatus = BookingStatusEnum.COMPLETED;
        } else if (startTime <= now && endTime >= now) {
          // Active booking
          calculatedStatus = BookingStatusEnum.CONFIRMED; // No change but we'll label as "active" in UI
        }
      }
      
      return {
        id: booking.id,
        type: isSeatBooking ? 'seat' : 'meeting',
        customer_id: booking.customer_id,
        seat_id: isSeatBooking ? booking.seat_id : booking.meeting_room_id,
        start_time: booking.start_time,
        end_time: booking.end_time,
        total_price: booking.total_price,
        status: calculatedStatus,
        booking_status: booking.status, // Original status from database
        is_active: calculatedStatus === BookingStatusEnum.CONFIRMED && 
                   new Date(booking.start_time) <= new Date() && 
                   new Date(booking.end_time) > new Date(),
        is_upcoming: calculatedStatus === BookingStatusEnum.CONFIRMED && 
                     new Date(booking.start_time) > new Date(),
        is_completed: calculatedStatus === BookingStatusEnum.COMPLETED || 
                      (calculatedStatus === BookingStatusEnum.CONFIRMED && 
                       new Date(booking.end_time) < new Date()),
        is_cancelled: calculatedStatus === BookingStatusEnum.CANCELLED,
        created_at: booking.created_at,
        updated_at: booking.updated_at,
        seat: isSeatBooking ? {
          id: booking.seat_id,
          seat_number: seatOrRoom?.seat_number,
          seat_code: seatOrRoom?.seat_code
        } : null,
        meeting_room: !isSeatBooking ? {
          id: booking.meeting_room_id,
          seat_number: seatOrRoom?.seat_number,
          seat_code: seatOrRoom?.seat_code,
          num_participants: booking.num_participants,
          amenities: booking.amenities
        } : null,
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
      error: (error as Error).message,
      data: null
    }, { status: 500 });
  }
}

// Example of using formatApiEndpoint function
// Removed export to fix Next.js route error
function getBookingApiUrl(branch: string, seatingType: any): string {
  return `/api/bookings?branch=${branch}&type=${seatingType}`;
}

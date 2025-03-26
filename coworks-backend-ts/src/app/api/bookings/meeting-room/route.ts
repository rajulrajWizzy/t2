export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyToken } from '@/utils/jwt';
import { ApiResponse } from '@/types/common';
import { Op } from 'sequelize';
import { SeatingTypeEnum, AvailabilityStatusEnum, SeatingType } from '@/types/seating';
import { BookingStatusEnum } from '@/types/booking';
import { verifyProfileComplete } from '../../middleware/verifyProfileComplete';
import { calculateBookingCost } from '@/utils/bookingCalculations';
import { Branch } from '@/types/branch';

/**
 * POST /api/bookings/meeting-room - Book a meeting room using coins
 */
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
      seat_id, 
      seat_code,
      start_time, 
      end_time, 
      num_participants, 
      amenities,
      use_coins = true, // This parameter is maintained for backward compatibility but will be ignored
    } = body;
    
    // Validate required fields
    if ((!seat_id && !seat_code) || !start_time || !end_time || !num_participants) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Missing required fields',
        data: null
      }, { status: 400 });
    }
    
    // Validate dates
    const startTimeDate = new Date(start_time);
    const endTimeDate = new Date(end_time);
    
    if (isNaN(startTimeDate.getTime()) || isNaN(endTimeDate.getTime())) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Invalid date format',
        data: null
      }, { status: 400 });
    }
    
    if (startTimeDate >= endTimeDate) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'End time must be after start time',
        data: null
      }, { status: 400 });
    }
    
    // Get the customer
    const customer_id = decoded.id;
    const customer = await models.Customer.findByPk(customer_id);
    if (!customer) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Customer not found',
        data: null
      }, { status: 404 });
    }
    
    // Check and reset coins if needed (monthly reset)
    await customer.resetCoinsIfNeeded();
    
    // Look up meeting room
    let seatWhere = {};
    if (seat_id) {
      seatWhere = { id: seat_id };
    } else if (seat_code) {
      seatWhere = { seat_code: seat_code };
    }
    
    // Find the meeting room
    const meetingRoom = await models.Seat.findOne({
      where: {
        ...seatWhere,
        '$SeatingType.name$': SeatingTypeEnum.MEETING_ROOM
      },
      include: [
        {
          model: models.SeatingType,
          as: 'SeatingType',
          required: true
        },
        {
          model: models.Branch,
          as: 'Branch'
        }
      ]
    });
    
    if (!meetingRoom) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Meeting room not found',
        data: null
      }, { status: 404 });
    }
    
    // Check if the meeting room is available
    if (meetingRoom.availability_status !== AvailabilityStatusEnum.AVAILABLE) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Meeting room is not available',
        data: null
      }, { status: 400 });
    }
    
    // Check for existing bookings in the same time slot
    const existingBookings = await models.MeetingBooking.findAll({
      where: {
        meeting_room_id: meetingRoom.id,
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
          [Op.notIn]: [BookingStatusEnum.CANCELLED]
        }
      }
    });
    
    if (existingBookings.length > 0) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Meeting room is already booked for this time slot',
        data: null
      }, { status: 400 });
    }
    
    // Calculate booking duration in hours
    const durationMs = endTimeDate.getTime() - startTimeDate.getTime();
    const durationHours = Math.ceil(durationMs / (1000 * 60 * 60)); // Round up to the nearest hour
    
    // Get the seating type
    const seatingType = meetingRoom.get('SeatingType') as SeatingType;
    
    // Calculate cost based on hourly rate (ensure everything is a number)
    const hourlyRate: number = Number(seatingType.hourly_rate);
    const initialTotal: number = hourlyRate * durationHours;
    const roundedTotal: number = parseFloat(initialTotal.toFixed(2));
    const totalCost: number = roundedTotal;
    
    // Convert cost to coins (1 coin = 1 rupee)
    const requiredCoins: number = Math.round(totalCost);
    
    // Check if user has enough coins
    if (customer.coins_balance < requiredCoins) {
      return NextResponse.json<ApiResponse<any>>({
        success: false,
        message: 'Insufficient coins for booking',
        data: {
          available_coins: customer.coins_balance,
          required_coins: requiredCoins,
          coins_needed: requiredCoins - customer.coins_balance
        }
      }, { status: 400 });
    }
    
    // Create the booking with a transaction to ensure consistency
    const booking = await models.sequelize.transaction(async (t) => {
      // Create meeting booking
      const newBooking = await models.MeetingBooking.create({
        customer_id: Number(customer_id),
        meeting_room_id: meetingRoom.id,
        start_time: startTimeDate,
        end_time: endTimeDate,
        num_participants,
        amenities: amenities || null,
        total_price: totalCost,
        status: BookingStatusEnum.CONFIRMED // Fully paid with coins
      }, { transaction: t });
      
      // Deduct coins from the customer's balance
      await customer.deductCoins(
        requiredCoins, 
        newBooking.id, 
        `Meeting room booking: ${durationHours} hour(s) at ${hourlyRate}/hour`
      );
      
      // Update the meeting room availability
      await meetingRoom.update({ 
        availability_status: AvailabilityStatusEnum.BOOKED 
      }, { transaction: t });
      
      return newBooking;
    });
    
    // Get branch data from the association
    const branch = meetingRoom.get('Branch') as Branch | null;
    
    // Return booking details along with payment information
    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: 'Meeting room booked successfully',
      data: {
        booking: {
          id: booking.id,
          meeting_room_id: booking.meeting_room_id,
          start_time: booking.start_time,
          end_time: booking.end_time,
          num_participants: booking.num_participants,
          amenities: booking.amenities,
          total_price: booking.total_price,
          status: booking.status
        },
        payment: {
          method: 'COINS',
          coins_used: requiredCoins,
          coins_remaining: customer.coins_balance
        },
        meeting_room: {
          id: meetingRoom.id,
          name: meetingRoom.seat_number,
          code: meetingRoom.seat_code,
          hourly_rate: hourlyRate,
          branch: branch ? {
            id: branch.id,
            name: branch.name,
            location: branch.location
          } : null
        }
      }
    });
  } catch (error) {
    console.error('Error booking meeting room:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to book meeting room',
      error: (error as Error).message,
      data: null
    }, { status: 500 });
  }
} 
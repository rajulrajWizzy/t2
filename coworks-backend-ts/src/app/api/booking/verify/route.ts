import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/utils/jwt-wrapper';
import models from '@/models';
import { Op } from 'sequelize';
import { BookingStatusEnum } from '@/types/booking';
import { AvailabilityStatusEnum } from '@/types/seating';

interface VerifyBookingRequest {
  seatTypeId: string;
  numSeats: number;
  startTime: string;
  endTime: string;
  duration: number;
  durationType: 'hourly' | 'daily' | 'monthly';
}

interface VerifyBookingResponse {
  success: boolean;
  data?: {
    availableSeats: number;
    totalPrice: number;
    canBook: boolean;
    message?: string;
  };
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    // Parse request body
    const body: VerifyBookingRequest = await request.json();
    const { seatTypeId, numSeats, startTime, endTime, duration, durationType } = body;

    // Validate request parameters
    if (!seatTypeId || !numSeats || !startTime || !endTime || !duration || !durationType) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required booking parameters' 
      }, { status: 400 });
    }

    // Check seat availability
    const availableSeats = await models.Seat.findAll({
      where: {
        seating_type_id: seatTypeId,
        availability_status: AvailabilityStatusEnum.AVAILABLE
      }
    });

    // Check existing bookings for the time period
    const existingBookings = await models.SeatBooking.findAll({
      where: {
        seat_id: {
          [Op.in]: availableSeats.map(seat => seat.id)
        },
        start_time: {
          [Op.lt]: new Date(endTime)
        },
        end_time: {
          [Op.gt]: new Date(startTime)
        },
        status: {
          [Op.in]: [BookingStatusEnum.PENDING, BookingStatusEnum.CONFIRMED]
        }
      }
    });

    // Calculate actually available seats
    const bookedSeatIds = new Set(existingBookings.map(booking => booking.seat_id));
    const actuallyAvailableSeats = availableSeats.filter(seat => !bookedSeatIds.has(seat.id));
    const availableSeatCount = actuallyAvailableSeats.length;

    // Get base price and calculate total
    const seatType = await models.SeatingType.findByPk(seatTypeId);
    if (!seatType) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid seat type' 
      }, { status: 400 });
    }

    let basePrice;
    switch(durationType) {
      case 'hourly':
        basePrice = seatType.hourly_rate;
        break;
      case 'daily':
        basePrice = seatType.daily_rate;
        break;
      case 'monthly':
        basePrice = seatType.monthly_rate;
        break;
      default:
        basePrice = seatType.hourly_rate;
    }

    const totalPrice = basePrice * duration * Math.min(numSeats, availableSeatCount);

    // Prepare response
    const response: VerifyBookingResponse = {
      success: true,
      data: {
        availableSeats: availableSeatCount,
        totalPrice,
        canBook: availableSeatCount >= numSeats,
        message: availableSeatCount < numSeats 
          ? `Only ${availableSeatCount} seats are available for the selected time period` 
          : undefined
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error verifying booking:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
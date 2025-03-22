// Explicitly set Node.js runtime for this route


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { ApiResponse } from '@/types/common';
import { SeatingTypeEnum } from '@/types/seating';
import { Op } from 'sequelize';

// GET available slots for a branch and seating type with date range support
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Extract query parameters
    const url = new URL(request.url);
    const branchCode = url.searchParams.get('branch_code');
    const seatingTypeCode = url.searchParams.get('seating_type_code');
    const startDate = url.searchParams.get('start_date') || new Date().toISOString().split('T')[0];
    const endDate = url.searchParams.get('end_date');
    const startTime = url.searchParams.get('start_time');
    const endTime = url.searchParams.get('end_time');
    
    // Validate required filters
    if (!branchCode) {
      return NextResponse.json({
        success: false,
        message: 'Branch code is required'
      }, { status: 400 });
    }
    
    if (!seatingTypeCode) {
      return NextResponse.json({
        success: false,
        message: 'Seating type code is required'
      }, { status: 400 });
    }
    
    // Find the branch
    const branch = await models.Branch.findOne({
      where: { short_code: branchCode },
      attributes: ['id', 'name', 'location', 'address', 'short_code', 'opening_time', 'closing_time']
    });
    
    if (!branch) {
      return NextResponse.json({
        success: false,
        message: `Branch with code ${branchCode} not found`
      }, { status: 404 });
    }
    
    // Find the seating type
    const seatingType = await models.SeatingType.findOne({
      where: { short_code: seatingTypeCode },
      attributes: [
        'id', 'name', 'description', 'hourly_rate', 'is_hourly', 
        'min_booking_duration', 'min_seats', 'short_code'
      ]
    });
    
    if (!seatingType) {
      return NextResponse.json({
        success: false,
        message: `Seating type with code ${seatingTypeCode} not found`
      }, { status: 404 });
    }
    
    // Calculate end date for non-hourly bookings (if not provided)
    let calculatedEndDate = endDate;
    if (!calculatedEndDate && !seatingType.is_hourly) {
      // Use the minimum booking duration to calculate end date
      const minDuration = seatingType.min_booking_duration || 1; // default to 1 day if not set
      const startDateObj = new Date(startDate);
      
      // Calculate end date based on seating type
      switch(seatingType.name) {
        case SeatingTypeEnum.HOT_DESK:
          // Hot desk: minimum 1 month
          startDateObj.setMonth(startDateObj.getMonth() + minDuration);
          break;
        case SeatingTypeEnum.DEDICATED_DESK:
          // Dedicated desk: minimum 1 month
          startDateObj.setMonth(startDateObj.getMonth() + minDuration);
          break;
        case SeatingTypeEnum.CUBICLE:
          // Cubicle: minimum 1 month
          startDateObj.setMonth(startDateObj.getMonth() + minDuration);
          break;
        case SeatingTypeEnum.DAILY_PASS:
          // Daily pass: minimum 1 day
          startDateObj.setDate(startDateObj.getDate() + minDuration);
          break;
        default:
          // Default behavior - add the minimum duration in days
          startDateObj.setDate(startDateObj.getDate() + minDuration);
      }
      
      calculatedEndDate = startDateObj.toISOString().split('T')[0];
    }
    
    // Find all available seats of this seating type in the branch
    const seats = await models.Seat.findAll({
      where: {
        branch_id: branch.id,
        seating_type_id: seatingType.id,
        availability_status: 'AVAILABLE'
      },
      attributes: ['id', 'seat_number', 'seat_code', 'price'],
      order: [['seat_number', 'ASC']]
    });
    
    if (seats.length === 0) {
      return NextResponse.json({
        success: false,
        message: `No available seats found for seating type ${seatingTypeCode} in branch ${branchCode}`
      }, { status: 404 });
    }
    
    // Get all seat IDs
    const seatIds = seats.map(seat => seat.id);
    
    // Find existing bookings that overlap with the requested time period
    const bookingWhere: any = {
      seat_id: { [Op.in]: seatIds },
      status: { [Op.notIn]: ['CANCELLED'] }
    };
    
    // For hourly bookings (meeting rooms)
    if (seatingType.is_hourly) {
      if (startTime && endTime) {
        // For single-day hourly bookings
        bookingWhere[Op.or] = [
          {
            start_time: {
              [Op.between]: [
                `${startDate}T${startTime}`, 
                `${startDate}T${endTime}`
              ]
            }
          },
          {
            end_time: {
              [Op.between]: [
                `${startDate}T${startTime}`, 
                `${startDate}T${endTime}`
              ]
            }
          },
          {
            [Op.and]: [
              { start_time: { [Op.lt]: `${startDate}T${startTime}` } },
              { end_time: { [Op.gt]: `${startDate}T${endTime}` } }
            ]
          }
        ];
      } else {
        // If no specific time is provided, check for any bookings on that day
        bookingWhere[Op.and] = [
          { start_time: { [Op.gte]: `${startDate}T00:00:00` } },
          { start_time: { [Op.lt]: `${startDate}T23:59:59` } }
        ];
      }
    } else {
      // For non-hourly bookings (everything except meeting rooms)
      if (calculatedEndDate) {
        // Check for any bookings that overlap with the date range
        bookingWhere[Op.or] = [
          // Booking starts during our period
          {
            start_time: {
              [Op.between]: [
                `${startDate}T00:00:00`, 
                `${calculatedEndDate}T23:59:59`
              ]
            }
          },
          // Booking ends during our period
          {
            end_time: {
              [Op.between]: [
                `${startDate}T00:00:00`, 
                `${calculatedEndDate}T23:59:59`
              ]
            }
          },
          // Booking completely encompasses our period
          {
            [Op.and]: [
              { start_time: { [Op.lt]: `${startDate}T00:00:00` } },
              { end_time: { [Op.gt]: `${calculatedEndDate}T23:59:59` } }
            ]
          }
        ];
      } else {
        // If no end date, check for any bookings starting from the start date
        bookingWhere[Op.or] = [
          { start_time: { [Op.gte]: `${startDate}T00:00:00` } },
          { end_time: { [Op.gte]: `${startDate}T00:00:00` } }
        ];
      }
    }
    
    // Get all bookings that would conflict with the requested time
    const existingBookings = await models.SeatBooking.findAll({
      where: bookingWhere,
      attributes: ['id', 'seat_id', 'start_time', 'end_time', 'status'],
      order: [['start_time', 'ASC']]
    });
    
    // Create a set of booked seat IDs
    const bookedSeatIds = new Set(existingBookings.map(booking => booking.seat_id));
    
    // Filter out booked seats
    const availableSeats = seats.filter(seat => !bookedSeatIds.has(seat.id));
    
    // Calculate time slots for meeting rooms (if applicable)
    let timeSlots = [];
    if (seatingType.is_hourly && seatingType.name === SeatingTypeEnum.MEETING_ROOM && startDate && startTime && endTime) {
      const startTimeHour = parseInt(startTime.split(':')[0]);
      const endTimeHour = parseInt(endTime.split(':')[0]);
      
      // Default to branch opening/closing times if not specified
      const branchOpeningHour = branch.opening_time ? 
        parseInt(branch.opening_time.split(':')[0]) : 8; // Default 8 AM
      const branchClosingHour = branch.closing_time ? 
        parseInt(branch.closing_time.split(':')[0]) : 18; // Default 6 PM
      
      // Generate hourly slots
      for (let hour = branchOpeningHour; hour < branchClosingHour; hour++) {
        const slotStartTime = `${hour.toString().padStart(2, '0')}:00`;
        const slotEndTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
        
        // Skip slots outside the requested time range
        if (startTime && endTime) {
          if (slotStartTime < startTime || slotEndTime > endTime) {
            continue;
          }
        }
        
        timeSlots.push({
          start_time: slotStartTime,
          end_time: slotEndTime,
          date: startDate
        });
      }
    }
    
    // Create the response based on seating type
    let responseData: any = {
      branch: {
        id: branch.id,
        name: branch.name,
        short_code: branch.short_code,
        location: branch.location,
        address: branch.address,
        opening_time: branch.opening_time,
        closing_time: branch.closing_time
      },
      seating_type: {
        id: seatingType.id,
        name: seatingType.name,
        short_code: seatingType.short_code,
        description: seatingType.description,
        hourly_rate: seatingType.hourly_rate,
        is_hourly: seatingType.is_hourly,
        min_booking_duration: seatingType.min_booking_duration,
        min_seats: seatingType.min_seats
      },
      start_date: startDate,
      end_date: calculatedEndDate || null,
      available_seats: availableSeats.map(seat => ({
        id: seat.id,
        seat_number: seat.seat_number,
        seat_code: seat.seat_code,
        price: seat.price
      })),
      seat_count: availableSeats.length,
      booking_requirements: {
        min_duration: seatingType.min_booking_duration,
        min_seats: seatingType.min_seats,
        duration_unit: seatingType.is_hourly ? 'hours' : 'months',
        is_hourly: seatingType.is_hourly
      }
    };
    
    // Add time slots if applicable
    if (timeSlots.length > 0) {
      responseData.time_slots = timeSlots;
    }
    
    // Add specific booking information based on seating type
    switch (seatingType.name) {
      case SeatingTypeEnum.HOT_DESK:
        responseData.booking_info = {
          type: "HOT_DESK",
          message: "Hot desk booking requires a minimum duration of 1 month",
          can_book_multiple: true
        };
        break;
      case SeatingTypeEnum.DEDICATED_DESK:
        responseData.booking_info = {
          type: "DEDICATED_DESK",
          message: "Dedicated desk booking requires a minimum duration of 1 month with minimum 1 seat",
          can_book_multiple: true
        };
        break;
      case SeatingTypeEnum.CUBICLE:
        responseData.booking_info = {
          type: "CUBICLE",
          message: "Cubicle booking requires a minimum duration of 1 month",
          can_book_multiple: false
        };
        break;
      case SeatingTypeEnum.MEETING_ROOM:
        responseData.booking_info = {
          type: "MEETING_ROOM",
          message: "Meeting room booking is on an hourly basis",
          can_book_multiple: false
        };
        break;
      case SeatingTypeEnum.DAILY_PASS:
        responseData.booking_info = {
          type: "DAILY_PASS",
          message: "Daily pass booking is for a single day",
          can_book_multiple: true
        };
        break;
    }
    
    // Calculate total price estimate (if applicable)
    if (startDate && calculatedEndDate) {
      let totalPrice = 0;
      
      if (seatingType.is_hourly && startTime && endTime) {
        // Calculate hours for hourly bookings
        const startHour = parseInt(startTime.split(':')[0]);
        const endHour = parseInt(endTime.split(':')[0]);
        const hours = endHour - startHour;
        totalPrice = seatingType.hourly_rate * hours;
      } else {
        // Calculate days for non-hourly bookings
        const start = new Date(startDate);
        const end = new Date(calculatedEndDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        totalPrice = seatingType.hourly_rate * diffDays * 24; // Daily rate * days
      }
      
      responseData.pricing = {
        base_rate: seatingType.hourly_rate,
        rate_unit: seatingType.is_hourly ? 'per hour' : 'per day',
        estimated_total: totalPrice
      };
    }
    
    return NextResponse.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch available slots',
      error: (error as Error).message
    }, { status: 500 });
  }
} 

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { Op } from 'sequelize';
import { verifyToken } from '@/config/jwt';
import { ApiResponse } from '@/types/common';
import { TimeSlotGenerationParams } from '@/types/booking';

// Define interfaces for our response structure
interface SlotCategory {
  count: number;
  slots: any[];
}

interface SlotsBranchResponse {
  date: string;
  branch_id: number;
  branch_code?: string;
  total_slots: number;
  available: SlotCategory;
  booked: SlotCategory;
  maintenance: SlotCategory;
}

interface SlotGenerationResponse {
  count: number;
}

// GET slots based on filters
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Extract query parameters
    const url = new URL(request.url);
    const branch_id = url.searchParams.get('branch_id');
    const branch_code = url.searchParams.get('branch_code');
    const seat_id = url.searchParams.get('seat_id');
    const seating_type_id = url.searchParams.get('seating_type_id');
    const seating_type_code = url.searchParams.get('seating_type_code');
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const availability = url.searchParams.get('availability'); // 'available', 'booked', 'maintenance', or 'all'
    
    // Validate required filters - need either branch_id or branch_code
    if (!branch_id && !branch_code) {
      const response: ApiResponse = {
        success: false,
        message: 'Branch ID or branch code is required'
      };
      
      return NextResponse.json(response, { status: 400 });
    }
    
    // Find branch if branch_code is provided
    let branchIdToUse = branch_id;
    let branchRecord = null;
    
    if (branch_code) {
      branchRecord = await models.Branch.findOne({
        where: { short_code: branch_code },
        attributes: ['id', 'name', 'short_code']
      });
      
      if (!branchRecord) {
        return NextResponse.json({
          success: false,
          message: `Branch with code ${branch_code} not found`
        }, { status: 404 });
      }
      
      branchIdToUse = branchRecord.id.toString();
    }
    
    // Prepare filter conditions
    const whereConditions: any = {
      branch_id: parseInt(branchIdToUse as string),
      date
    };
    
    // Add seat_id filter if provided
    if (seat_id) {
      whereConditions.seat_id = parseInt(seat_id);
    }
    
    // Find seating type ID from code if code is provided
    let seatingTypeIdToUse = seating_type_id;
    let seatingTypeRecord = null;
    
    if (seating_type_code && !seating_type_id) {
      seatingTypeRecord = await models.SeatingType.findOne({
        where: { short_code: seating_type_code }
      });
      
      if (seatingTypeRecord) {
        seatingTypeIdToUse = seatingTypeRecord.id.toString();
      } else {
        return NextResponse.json({
          success: false,
          message: `Seating type with code ${seating_type_code} not found`
        }, { status: 404 });
      }
    }
    
    // Prepare include for seating type filtering
    let seatingTypeWhere = {};
    if (seatingTypeIdToUse) {
      seatingTypeWhere = { id: parseInt(seatingTypeIdToUse as string) };
    }
    
    // Prepare seat availability conditions
    let seatAvailabilityWhere = {};
    if (availability === 'available') {
      seatAvailabilityWhere = { availability_status: 'AVAILABLE' };
    } else if (availability === 'maintenance') {
      seatAvailabilityWhere = { availability_status: 'MAINTENANCE' };
    }
    
    // Find all time slots matching the filters, including those that are not available
    const timeSlots = await models.TimeSlot.findAll({
      where: whereConditions,
      order: [['start_time', 'ASC']],
      include: [
        {
          model: models.Branch,
          as: 'Branch',
          attributes: ['id', 'name', 'address', 'location', 'short_code']
        },
        {
          model: models.Seat,
          as: 'Seat',
          attributes: ['id', 'seat_number', 'price', 'availability_status'],
          where: seatAvailabilityWhere,
          include: [
            {
              model: models.SeatingType,
              as: 'SeatingType',
              where: Object.keys(seatingTypeWhere).length ? seatingTypeWhere : undefined,
              attributes: ['id', 'name', 'short_code', 'hourly_rate', 'is_hourly']
            }
          ]
        },
        {
          model: models.SeatBooking,
          as: 'Booking',
          required: availability === 'booked', // Only require bookings if filtering for booked slots
          attributes: ['id', 'customer_id', 'status', 'total_price', 'start_time', 'end_time'],
          include: [
            {
              model: models.Customer,
              as: 'Customer',
              attributes: ['id', 'name', 'email']
            }
          ]
        }
      ]
    }) as any[];
    
    // Categorize slots by status
    const availableSlots = [];
    const bookedSlots = [];
    const maintenanceSlots = [];
    
    for (const slot of timeSlots) {
      // Skip slots where the seat doesn't match our seating type filter
      if ((seatingTypeIdToUse) && !slot.Seat?.SeatingType) {
        continue;
      }
      
      // Categorize based on slot and seat status
      if (slot.is_available && slot.Seat?.availability_status === 'AVAILABLE') {
        availableSlots.push(slot);
      } else if (!slot.is_available && slot.booking_id && slot.Booking) {
        bookedSlots.push(slot);
      } else if (slot.Seat?.availability_status === 'MAINTENANCE') {
        maintenanceSlots.push(slot);
      }
    }
    
    // Calculate which slots to include in response based on availability filter
    let slotsToReturn = {
      available: {
        count: availableSlots.length,
        slots: availableSlots
      },
      booked: {
        count: bookedSlots.length,
        slots: bookedSlots
      },
      maintenance: {
        count: maintenanceSlots.length,
        slots: maintenanceSlots
      }
    };
    
    // Filter response based on availability parameter if present
    if (availability === 'available') {
      slotsToReturn.booked.slots = [];
      slotsToReturn.maintenance.slots = [];
    } else if (availability === 'booked') {
      slotsToReturn.available.slots = [];
      slotsToReturn.maintenance.slots = [];
    } else if (availability === 'maintenance') {
      slotsToReturn.available.slots = [];
      slotsToReturn.booked.slots = [];
    }
    
    // Get branch short code if not already retrieved
    let branchShortCode = branchRecord?.short_code;
    if (!branchShortCode && branchIdToUse) {
      const branch = await models.Branch.findByPk(parseInt(branchIdToUse as string));
      branchShortCode = branch?.short_code;
    }
    
    const responseData: SlotsBranchResponse = {
      date,
      branch_id: parseInt(branchIdToUse as string),
      branch_code: branchShortCode || undefined,
      total_slots: timeSlots.length,
      ...slotsToReturn
    };
    
    const response: ApiResponse = {
      success: true,
      data: responseData
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching time slots:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to fetch time slots',
      error: (error as Error).message
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

// Generate time slots for a specific date and branch
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response: ApiResponse = {
        success: false,
        message: 'Unauthorized'
      };
      
      return NextResponse.json(response, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      const response: ApiResponse = {
        success: false,
        message: 'Unauthorized'
      };
      
      return NextResponse.json(response, { status: 401 });
    }
    
    // Parse the request body
    const body = await request.json() as TimeSlotGenerationParams;
    const { branch_id: bodyBranchId, branch_code, date, regenerate } = body;
    
    // Validate we have either branch_id or branch_code
    if (!bodyBranchId && !branch_code) {
      const response: ApiResponse = {
        success: false,
        message: 'Branch ID or branch code is required'
      };
      
      return NextResponse.json(response, { status: 400 });
    }
    
    if (!date) {
      const response: ApiResponse = {
        success: false,
        message: 'Date is required'
      };
      
      return NextResponse.json(response, { status: 400 });
    }
    
    // Find branch based on branch_id or branch_code
    let branch;
    
    if (bodyBranchId) {
      branch = await models.Branch.findByPk(bodyBranchId);
    } else if (branch_code) {
      branch = await models.Branch.findOne({
        where: { short_code: branch_code }
      });
    }
    
    if (!branch) {
      const response: ApiResponse = {
        success: false,
        message: 'Branch not found'
      };
      
      return NextResponse.json(response, { status: 404 });
    }
    
    const branch_id = branch.id;
    
    // If regenerate is true, delete existing slots for this branch and date
    if (regenerate) {
      await models.TimeSlot.destroy({
        where: {
          branch_id,
          date,
          is_available: true, // Only delete available slots
          booking_id: null    // Don't delete booked slots
        }
      });
    }
    
    // Check if slots already exist
    const existingSlots = await models.TimeSlot.count({
      where: {
        branch_id,
        date
      }
    });
    
    if (existingSlots > 0 && !regenerate) {
      const generationResponse: SlotGenerationResponse = { count: existingSlots };
      
      const response: ApiResponse = {
        success: false,
        message: 'Time slots already exist for this branch and date. Set regenerate to true to recreate.',
        data: generationResponse
      };
      
      return NextResponse.json(response);
    }
    
    // Get all seats for this branch
    const seats = await models.Seat.findAll({
      where: {
        branch_id,
        availability_status: 'AVAILABLE'
      }
    });
    
    if (seats.length === 0) {
      const response: ApiResponse = {
        success: false,
        message: 'No available seats found for this branch'
      };
      
      return NextResponse.json(response, { status: 404 });
    }
    
    // Parse branch opening and closing hours
    const opening = branch.opening_time.split(':');
    const closing = branch.closing_time.split(':');
    
    const startHour = parseInt(opening[0]);
    const endHour = parseInt(closing[0]);
    
    // Create slots (2-hour intervals from opening to closing)
    const newSlots = [];
    
    for (const seat of seats) {
      for (let hour = startHour; hour < endHour; hour += 2) {
        // Create time strings (HH:00:00 format)
        const startTime = `${hour.toString().padStart(2, '0')}:00:00`;
        const endTime = `${(hour + 2).toString().padStart(2, '0')}:00:00`;
        
        newSlots.push({
          branch_id,
          seat_id: seat.id,
          date,
          start_time: startTime,
          end_time: endTime,
          is_available: true,
          booking_id: null
        });
      }
    }
    
    // Bulk create slots
    const createdSlots = await models.TimeSlot.bulkCreate(newSlots);
    
    const generationResponse: SlotGenerationResponse = { count: createdSlots.length };
    
    const response: ApiResponse = {
      success: true,
      message: 'Time slots created successfully',
      data: generationResponse
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error creating time slots:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to create time slots',
      error: (error as Error).message
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}
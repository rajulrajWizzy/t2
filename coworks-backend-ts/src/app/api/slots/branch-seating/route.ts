import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { ApiResponse } from '@/types/common';

// Define interfaces for our response structure
interface SlotCategory {
  count: number;
  slots: any[];
}

interface BranchInfo {
  id: number;
  name: string;
  short_code?: string;
  location: string;
  address: string;
}

interface SeatingTypeInfo {
  id: number;
  name: string;
  short_code?: string;
}

interface SlotResponse {
  date: string;
  branch: BranchInfo;
  seating_type: SeatingTypeInfo;
  total_slots: number;
  available: SlotCategory;
  booked: SlotCategory;
  maintenance: SlotCategory;
}

// GET slots by branch and seating type
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Extract query parameters
    const url = new URL(request.url);
    const branch_id = url.searchParams.get('branch_id');
    const branch_code = url.searchParams.get('branch_code');
    const seating_type_id = url.searchParams.get('seating_type_id');
    const seating_type_code = url.searchParams.get('seating_type_code');
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    // Validate required filters - need either branch_id or branch_code
    if (!branch_id && !branch_code) {
      return NextResponse.json({
        success: false,
        message: 'Branch ID or branch code is required'
      }, { status: 400 });
    }
    
    // Validate required filters - need either seating_type_id or seating_type_code
    if (!seating_type_id && !seating_type_code) {
      return NextResponse.json({
        success: false,
        message: 'Seating type ID or seating type code is required'
      }, { status: 400 });
    }
    
    // Find the branch
    let branchWhere = {};
    if (branch_id) {
      branchWhere = { id: parseInt(branch_id) };
    } else if (branch_code) {
      branchWhere = { short_code: branch_code };
    }
    
    // Get branch attributes to include
    const branchAttributes = ['id', 'name', 'location', 'address'];
    
    // Check if short_code exists before including it
    try {
      await models.Branch.findOne({
        attributes: ['short_code'],
        limit: 1
      });
      // If no error, add short_code to attributes
      branchAttributes.push('short_code');
    } catch (error) {
      console.warn('Branch.short_code column does not exist, continuing without it');
    }
    
    const branch = await models.Branch.findOne({
      where: branchWhere,
      attributes: branchAttributes
    });
    
    if (!branch) {
      return NextResponse.json({
        success: false,
        message: 'Branch not found'
      }, { status: 404 });
    }
    
    // Find the seating type
    let seatingTypeWhere = {};
    if (seating_type_id) {
      seatingTypeWhere = { id: parseInt(seating_type_id) };
    } else if (seating_type_code) {
      seatingTypeWhere = { short_code: seating_type_code };
    }
    
    const seatingType = await models.SeatingType.findOne({
      where: seatingTypeWhere
    });
    
    if (!seatingType) {
      return NextResponse.json({
        success: false,
        message: 'Seating type not found'
      }, { status: 404 });
    }
    
    // Find all time slots for this branch, date, and seating type
    const timeSlots = await models.TimeSlot.findAll({
      where: {
        branch_id: branch.id,
        date
      },
      order: [['start_time', 'ASC']],
      include: [
        {
          model: models.Branch,
          as: 'Branch',
          attributes: branchAttributes
        },
        {
          model: models.Seat,
          as: 'Seat',
          required: true,
          where: { seating_type_id: seatingType.id },
          attributes: ['id', 'seat_number', 'price', 'availability_status'],
          include: [
            {
              model: models.SeatingType,
              as: 'SeatingType',
              attributes: ['id', 'name', 'short_code', 'hourly_rate', 'is_hourly']
            }
          ]
        },
        {
          model: models.SeatBooking,
          as: 'Booking',
          required: false,
          attributes: ['id', 'customer_id', 'status', 'total_price', 'start_time', 'end_time'],
          include: [
            {
              model: models.Customer,
              as: 'Customer',
              attributes: ['id', 'name', 'email', 'company_name']
            }
          ]
        }
      ]
    }) as any[];
    
    // Categorize slots
    const availableSlots = [];
    const bookedSlots = [];
    const maintenanceSlots = [];
    
    for (const slot of timeSlots) {
      if (slot.is_available && slot.Seat?.availability_status === 'AVAILABLE') {
        availableSlots.push(slot);
      } else if (!slot.is_available && slot.booking_id && slot.Booking) {
        bookedSlots.push(slot);
      } else if (slot.Seat?.availability_status === 'MAINTENANCE') {
        maintenanceSlots.push(slot);
      }
    }
    
    const branchInfo: BranchInfo = {
      id: branch.id,
      name: branch.name,
      location: branch.location,
      address: branch.address
    };
    
    // Only add short_code if it exists
    if (branch.short_code) {
      branchInfo.short_code = branch.short_code;
    }
    
    const seatingTypeInfo: SeatingTypeInfo = {
      id: seatingType.id,
      name: seatingType.name
    };
    
    // Only add short_code if it exists
    if (seatingType.short_code) {
      seatingTypeInfo.short_code = seatingType.short_code;
    }
    
    const responseData: SlotResponse = {
      date,
      branch: branchInfo,
      seating_type: seatingTypeInfo,
      total_slots: timeSlots.length,
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
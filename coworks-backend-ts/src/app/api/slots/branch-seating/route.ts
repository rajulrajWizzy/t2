import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { ApiResponse } from '@/types/common';

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
    
    const branch = await models.Branch.findOne({
      where: branchWhere,
      attributes: ['id', 'name', 'short_code', 'location', 'address']
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
          attributes: ['id', 'name', 'short_code', 'location', 'address']
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
    
    const response: ApiResponse = {
      success: true,
      data: {
        date,
        branch: {
          id: branch.id,
          name: branch.name,
          short_code: branch.short_code,
          location: branch.location,
          address: branch.address
        },
        seating_type: {
          id: seatingType.id,
          name: seatingType.name,
          short_code: seatingType.short_code
        },
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
      }
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
import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { Op } from 'sequelize';
import { verifyToken } from '@/config/jwt';
import { ApiResponse } from '@/types/common';
import { SeatingTypeEnum } from '@/types/seating';

// Define interfaces for the response structure
interface SlotCategory {
  count: number;
  slots: any[];
}

interface SeatingTypeData {
  id: number;
  name: string | SeatingTypeEnum;
  short_code: string | undefined;
  total_slots: number;
  available: SlotCategory;
  booked: SlotCategory;
  maintenance: SlotCategory;
}

interface BranchData {
  id: number;
  name: string;
  short_code: string | undefined;
  location: string;
  address: string;
  seating_types: SeatingTypeData[];
}

interface CategorizedResult {
  date: string;
  branches: BranchData[];
}

// GET slots categorized by seating type
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Extract query parameters
    const url = new URL(request.url);
    const branch_id = url.searchParams.get('branch_id');
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const authHeader = request.headers.get('authorization');

    // Check authentication
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // First, get all active seating types
    const seatingTypes = await models.SeatingType.findAll();
    
    if (!seatingTypes || seatingTypes.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No seating types found'
      }, { status: 404 });
    }
    
    // Prepare branch conditions
    const branchConditions = branch_id ? { id: parseInt(branch_id) } : {};
    
    // Get all branches or the specific branch
    const branches = await models.Branch.findAll({
      where: branchConditions,
      attributes: ['id', 'name', 'short_code', 'location', 'address']
    });
    
    if (!branches || branches.length === 0) {
      return NextResponse.json({
        success: false,
        message: branch_id ? 'Branch not found' : 'No branches found'
      }, { status: 404 });
    }
    
    // Create result structure
    const result: CategorizedResult = {
      date,
      branches: []
    };
    
    // For each branch
    for (const branch of branches) {
      const branchData: BranchData = {
        id: branch.id,
        name: branch.name,
        short_code: branch.short_code,
        location: branch.location,
        address: branch.address,
        seating_types: []
      };
      
      // For each seating type
      for (const seatingType of seatingTypes) {
        // Find all time slots for this branch, date, and seating type
        const timeSlots = await models.TimeSlot.findAll({
          where: {
            branch_id: branch.id,
            date
          },
          order: [['start_time', 'ASC']],
          include: [
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
              required: false
            }
          ]
        }) as any[];
        
        // Skip if no slots found for this seating type
        if (!timeSlots || timeSlots.length === 0) {
          continue;
        }
        
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
        
        // Add seating type data to branch only if it has slots
        if (timeSlots.length > 0) {
          branchData.seating_types.push({
            id: seatingType.id,
            name: seatingType.name,
            short_code: seatingType.short_code,
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
          });
        }
      }
      
      // Only add branch if it has seating types with slots
      if (branchData.seating_types.length > 0) {
        result.branches.push(branchData);
      }
    }
    
    const response: ApiResponse = {
      success: true,
      data: result
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching categorized time slots:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to fetch categorized time slots',
      error: (error as Error).message
    };
    
    return NextResponse.json(response, { status: 500 });
  }
} 
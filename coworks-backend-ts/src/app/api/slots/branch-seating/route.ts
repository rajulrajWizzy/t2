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
    
    // Validate required filters - need either seating_type_id or seating_type_code
    if (!seating_type_id && !seating_type_code) {
      const response: ApiResponse = {
        success: false,
        message: 'Either seating_type_id or seating_type_code is required'
      };
      
      return NextResponse.json(response, { status: 400 });
    }
    
    // Validate branch_id parameter
    if (!branch_id) {
      const response: ApiResponse = {
        success: false,
        message: 'Branch ID is required'
      };
      
      return NextResponse.json(response, { status: 400 });
    }
    
    // Ensure branch_id is a valid number
    const branchIdNum = parseInt(branch_id);
    if (isNaN(branchIdNum)) {
      const response: ApiResponse = {
        success: false,
        message: 'Branch ID must be a valid number'
      };
      
      return NextResponse.json(response, { status: 400 });
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
        message: 'Branch not found',
        data: null
      } as ApiResponse<null>, { status: 404 });
    }
    
    // Find the seating type
    let seatingTypeWhere: any = {};
    if (seating_type_id) {
      const seatingTypeIdNum = parseInt(seating_type_id);
      if (isNaN(seatingTypeIdNum)) {
        const response: ApiResponse<null> = {
          success: false,
          message: 'Seating type ID must be a valid number',
          data: null
        };
        
        return NextResponse.json(response, { status: 400 });
      }
      seatingTypeWhere = { id: seatingTypeIdNum };
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
    
<<<<<<< Updated upstream
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
=======
    // Get seats for this branch filtered by seating type if specified
    const seatsQuery: any = {
      where: { branch_id: branch.id },
      attributes: ['id', 'seat_number', 'seat_code', 'price', 'availability_status'],
      include: [{
        model: models.SeatingType,
        as: 'SeatingType',
        attributes: ['id', 'name', 'short_code']
      }]
    };
    
    // If a specific seating type is requested, filter seats by that type
    if (Object.keys(seatingTypeWhere).length > 0) {
      seatsQuery.include[0].where = seatingTypeWhere;
    }
    
    // Retrieve seats with their seating types
    const seats = await models.Seat.findAll(seatsQuery);
    
    // Group seats by seating type
    const seatingTypeMap = new Map();
    
    // First add all seating types from the query
    seatingTypes.forEach(st => {
      seatingTypeMap.set(st.id, {
        id: st.id,
        name: st.name,
        short_code: st.short_code,
        description: st.description,
        hourly_rate: st.hourly_rate,
        is_hourly: st.is_hourly,
        min_booking_duration: st.min_booking_duration,
        min_seats: st.min_seats,
        seats: [],
        seat_count: 0
      });
    });
    
    // Then add seats to their respective seating types
    seats.forEach(seat => {
      const seatingTypeId = (seat as any).SeatingType.id;
      
      // If this seating type wasn't previously added, add it now
      if (!seatingTypeMap.has(seatingTypeId)) {
        seatingTypeMap.set(seatingTypeId, {
          id: (seat as any).SeatingType.id,
          name: (seat as any).SeatingType.name,
          short_code: (seat as any).SeatingType.short_code,
          seats: [],
          seat_count: 0
        });
      }
      
      // Only include seat ID for dedicated desk types, as specified in requirements
      const seatData = {
        seat_number: seat.seat_number,
        seat_code: seat.seat_code,
        price: seat.price,
        availability_status: seat.availability_status
      };
      
      // Add ID only for dedicated desk as per requirements
      if ((seat as any).SeatingType.name === 'DEDICATED_DESK') {
        (seatData as any).id = seat.id;
      }
      
      seatingTypeMap.get(seatingTypeId).seats.push(seatData);
      seatingTypeMap.get(seatingTypeId).seat_count++;
    });
    
    // Format the response
    const branchWithSeatingTypes = {
      ...branch.toJSON(),
      seating_types: Array.from(seatingTypeMap.values()),
      total_seats: seats.length
    };
    
    // Check for branch images specific to seating type
    try {
      const branchImages = await models.BranchImage.findAll({
        where: { 
          branch_id: branch.id,
          ...(Object.keys(seatingTypeWhere).length > 0 ? { seating_type: seatingTypes.map(st => st.id) } : {})
        }
      });
      
      if (branchImages && branchImages.length > 0) {
        // Process images and group by seating type
        const imagesBySeatingType = new Map();
        
        branchImages.forEach(img => {
          const seatingTypeId = (img as any).seating_type || (img as any).seating_type_id;
          if (!imagesBySeatingType.has(seatingTypeId)) {
            imagesBySeatingType.set(seatingTypeId, []);
          }
          imagesBySeatingType.get(seatingTypeId).push(img.image_url);
        });
        
        // Add images to each seating type
        Array.from(seatingTypeMap.values()).forEach(st => {
          const images = imagesBySeatingType.get(st.id) || [];
          st.images = images;
        });
>>>>>>> Stashed changes
      }
    }
    
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
    const branchInfo: BranchInfo = {
      id: branch.id,
      name: branch.name,
      location: branch.location,
      address: branch.address
    };
=======
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
    const response: ApiResponse<any> = {
      success: true,
      message: 'Branch seating data retrieved successfully',
      data: branchWithSeatingTypes
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching branch with seating:', error);
>>>>>>> Stashed changes
    
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
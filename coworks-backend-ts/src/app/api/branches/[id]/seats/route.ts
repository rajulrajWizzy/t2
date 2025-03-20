import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { ApiResponse } from '@/types/common';

// Helper function to find branch by ID or code
async function findBranch(idOrCode: string) {
  // Check if the parameter is a numeric ID or a branch code
  const isNumeric = /^\d+$/.test(idOrCode);
  
  let whereClause = {};
  if (isNumeric) {
    whereClause = { id: parseInt(idOrCode) };
  } else {
    whereClause = { short_code: idOrCode };
  }
  
  // Try to find the branch
  const branch = await models.Branch.findOne({
    where: whereClause,
    attributes: ['id', 'name', 'address', 'location', 'short_code']
  });
  
  return branch;
}

// GET all seats for a specific branch
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;
    
    // Find branch using the helper function
    const branch = await findBranch(id);
    
    if (!branch) {
      return NextResponse.json(
        { success: false, message: 'Branch not found' },
        { status: 404 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const seatingTypeId = searchParams.get('seating_type_id');
    const seatingTypeCode = searchParams.get('seating_type_code');
    
    // Prepare filter conditions for seats
    const whereConditions: any = {
      branch_id: branch.id
    };
    
    // Prepare filter conditions for seating type
    let seatingTypeCondition = {};
    if (seatingTypeId) {
      seatingTypeCondition = { id: parseInt(seatingTypeId) };
    } else if (seatingTypeCode) {
      seatingTypeCondition = { short_code: seatingTypeCode };
    }
    
    // Find seats for this branch
    const seats = await models.Seat.findAll({
      where: whereConditions,
      include: [
        {
          model: models.SeatingType,
          as: 'SeatingType',
          ...(Object.keys(seatingTypeCondition).length > 0 ? { where: seatingTypeCondition } : {})
        }
      ],
      order: [['seat_number', 'ASC']]
    });
    
    // Group seats by seating type
    const seatingTypeMap = new Map();
    seats.forEach(seat => {
      const seatingTypeData = seat.SeatingType;
      if (seatingTypeData) {
        const seatingTypeId = seatingTypeData.id;
        if (!seatingTypeMap.has(seatingTypeId)) {
          seatingTypeMap.set(seatingTypeId, {
            id: seatingTypeData.id,
            name: seatingTypeData.name,
            short_code: seatingTypeData.short_code,
            description: seatingTypeData.description,
            hourly_rate: seatingTypeData.hourly_rate,
            is_hourly: seatingTypeData.is_hourly,
            min_booking_duration: seatingTypeData.min_booking_duration,
            min_seats: seatingTypeData.min_seats,
            seats: [],
            seat_count: 0
          });
        }
        // Convert seat to plain object before adding to result
        const seatData = {
          id: seat.id,
          branch_id: seat.branch_id,
          seating_type_id: seat.seating_type_id,
          seat_number: seat.seat_number,
          seat_code: seat.seat_code,
          price: seat.price,
          availability_status: seat.availability_status,
          created_at: seat.created_at,
          updated_at: seat.updated_at
        };
        seatingTypeMap.get(seatingTypeId).seats.push(seatData);
        seatingTypeMap.get(seatingTypeId).seat_count++;
      }
    });
    
    // Format the response
    const branchWithSeats = {
      id: branch.id,
      name: branch.name,
      address: branch.address,
      location: branch.location,
      short_code: branch.short_code,
      seating_types: Array.from(seatingTypeMap.values()),
      total_seats: seats.length
    };
    
    return NextResponse.json({
      success: true,
      data: branchWithSeats
    });
  } catch (error) {
    console.error('Error fetching seats for branch:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch seats for branch',
      error: (error as Error).message
    }, { status: 500 });
  }
} 
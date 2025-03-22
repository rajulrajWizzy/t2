// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/adminAuth';
import models from '@/models';
import { ApiResponse } from '@/types/common';
import { Op } from 'sequelize';

/**
 * GET /api/admin/seats/capacity - Get configurable seats with capacity options
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin authentication
    const adminAuth = await verifyAdmin(request);
    
    // If verifyAdmin returned an error response
    if ('status' in adminAuth) {
      return adminAuth as NextResponse;
    }
    
    // Get all cubicles and meeting rooms (configurable seat types)
    const seatingTypes = await models.SeatingType.findAll({
      where: {
        short_code: {
          [Op.in]: ['CU', 'MR'] // Only Cubicles and Meeting Rooms are configurable
        }
      },
      attributes: ['id', 'name', 'short_code', 'description', 'capacity_options']
    });
    
    const seatingTypeIds = seatingTypes.map(st => st.id);
    
    // Get all seats of configurable types
    const seats = await models.Seat.findAll({
      where: {
        seating_type_id: {
          [Op.in]: seatingTypeIds
        }
      },
      include: [
        {
          model: models.SeatingType,
          as: 'SeatingType'
        },
        {
          model: models.Branch,
          as: 'Branch',
          attributes: ['id', 'name', 'location']
        }
      ],
      order: [
        ['branch_id', 'ASC'],
        ['seating_type_id', 'ASC']
      ]
    });
    
    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: `Retrieved ${seats.length} configurable seats`,
      data: {
        seats,
        seating_types: seatingTypes
      }
    });
  } catch (error) {
    console.error('Error retrieving configurable seats:', error);
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to retrieve configurable seats',
      data: null,
      error: (error as Error).message
    }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/seats/capacity - Update seat capacity
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin authentication
    const adminAuth = await verifyAdmin(request);
    
    // If verifyAdmin returned an error response
    if ('status' in adminAuth) {
      return adminAuth as NextResponse;
    }
    
    // Parse request body
    const body = await request.json();
    const { seat_id, capacity } = body;
    
    if (!seat_id || !capacity) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Seat ID and capacity are required',
        data: null
      }, { status: 400 });
    }
    
    // Update the seat capacity
    const result = await models.Seat.update({
      capacity: parseInt(capacity),
      is_configurable: true
    }, {
      where: { id: parseInt(seat_id) }
    });
    
    if (result[0] === 0) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Seat not found or update failed',
        data: null
      }, { status: 404 });
    }
    
    // Get the updated seat
    const updatedSeat = await models.Seat.findByPk(parseInt(seat_id), {
      include: [
        {
          model: models.SeatingType,
          as: 'SeatingType'
        },
        {
          model: models.Branch,
          as: 'Branch'
        }
      ]
    });
    
    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: `Seat capacity updated to ${capacity}`,
      data: updatedSeat
    });
    
  } catch (error) {
    console.error('Error updating seat capacity:', error);
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to update seat capacity',
      data: null,
      error: (error as Error).message
    }, { status: 500 });
  }
}

/**
 * POST /api/admin/seats/capacity/bulk - Update multiple seat capacities at once
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin authentication
    const adminAuth = await verifyAdmin(request);
    
    // If verifyAdmin returned an error response
    if ('status' in adminAuth) {
      return adminAuth as NextResponse;
    }
    
    // Parse request body
    const body = await request.json();
    const { seats } = body;
    
    // Validate seats array
    if (!seats || !Array.isArray(seats) || seats.length === 0) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Valid seats array is required',
        data: null
      }, { status: 400 });
    }
    
    // Get all seating types with capacity options
    const seatingTypes = await models.SeatingType.findAll({
      where: {
        short_code: {
          [Op.in]: ['CU', 'MR'] // Cubicles and Meeting Rooms
        }
      },
      attributes: ['id', 'short_code', 'capacity_options']
    });
    
    // Create a map of seating type IDs to their capacity options
    const capacityOptionsMap = {};
    seatingTypes.forEach(st => {
      capacityOptionsMap[st.id] = {
        short_code: st.short_code,
        options: st.capacity_options
      };
    });
    
    // Process each seat update
    const results = {
      success: [],
      failed: []
    };
    
    for (const update of seats) {
      const { seat_id, capacity } = update;
      const seatId = parseInt(seat_id);
      const capacityValue = parseInt(capacity);
      
      // Validate update data
      if (isNaN(seatId) || isNaN(capacityValue) || capacityValue < 1) {
        results.failed.push({
          seat_id,
          capacity,
          error: 'Invalid seat data'
        });
        continue;
      }
      
      try {
        // Find the seat to get its seating type
        const seat = await models.Seat.findByPk(seatId, {
          attributes: ['id', 'seating_type_id', 'seat_number', 'seat_code']
        });
        
        if (!seat) {
          results.failed.push({
            seat_id,
            capacity,
            error: 'Seat not found'
          });
          continue;
        }
        
        // Check if seat type is configurable
        const seatType = capacityOptionsMap[seat.seating_type_id];
        if (!seatType) {
          results.failed.push({
            seat_id,
            capacity,
            error: 'Seat type is not configurable'
          });
          continue;
        }
        
        // Check if capacity is valid for this seat type
        if (seatType.options && !seatType.options.includes(capacityValue)) {
          results.failed.push({
            seat_id,
            capacity,
            error: `Invalid capacity for ${seatType.short_code}. Must be one of: ${seatType.options.join(', ')}`
          });
          continue;
        }
        
        // Update the seat
        await models.Seat.update({
          capacity: capacityValue,
          is_configurable: true
        }, {
          where: { id: seatId }
        });
        
        // Add to success results
        results.success.push({
          id: seatId,
          seat_number: seat.seat_number,
          seat_code: seat.seat_code,
          capacity: capacityValue,
          seating_type: seatType.short_code
        });
      } catch (error) {
        results.failed.push({
          seat_id,
          capacity,
          error: (error as Error).message
        });
      }
    }
    
    // Return the results of all updates
    return NextResponse.json<ApiResponse<any>>({
      success: results.failed.length === 0,
      message: results.failed.length === 0 
        ? 'All seats updated successfully' 
        : `${results.success.length} seats updated, ${results.failed.length} failed`,
      data: results
    });
  } catch (error) {
    console.error('Error updating seat capacities:', error);
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to process bulk seat capacity updates',
      data: null,
      error: (error as Error).message
    }, { status: 500 });
  }
} 

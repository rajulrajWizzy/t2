import { verifyAdmin } from '@/utils/adminAuth';
import { NextRequest, NextResponse } from 'next/server';
import db from '@/models';
import { ApiResponse } from '@/types/common';
import { SeatingTypeInput } from '@/types/seating';

/**
 * GET a seating type by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const adminAuth = await verifyAdmin(req);
    if ('status' in adminAuth) {
      return adminAuth as NextResponse;
    }

    const id = params.id;
    const seatingType = await db.SeatingType.findByPk(id);

    if (!seatingType) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: 'Seating type not found',
          data: null,
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: 'Seating type retrieved successfully',
      data: seatingType,
    });
  } catch (error) {
    console.error('Error retrieving seating type:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: 'Failed to retrieve seating type',
        data: null,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT/Update a seating type by ID
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication with proper permissions
    const adminAuth = await verifyAdmin(req);
    if ('status' in adminAuth) {
      return adminAuth as NextResponse;
    }

    // Check permissions - only super admins should update seating types
    if (adminAuth.role !== 'super_admin') {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: 'Permission denied: Only super admins can update seating types',
          data: null,
        },
        { status: 403 }
      );
    }

    const id = params.id;
    const body = await req.json() as SeatingTypeInput;

    // Validate cost_multiplier if provided
    if (body.cost_multiplier) {
      // Ensure cost_multiplier is a valid object with numeric values
      const isValidMultiplier = typeof body.cost_multiplier === 'object' && 
        Object.values(body.cost_multiplier).every(value => 
          typeof value === 'number' && value > 0 && value <= 1
        );

      if (!isValidMultiplier) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            message: 'Invalid cost_multiplier format. Must be an object with values between 0-1',
            data: null,
          },
          { status: 400 }
        );
      }
    }

    // Find the seating type
    const seatingType = await db.SeatingType.findByPk(id);

    if (!seatingType) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: 'Seating type not found',
          data: null,
        },
        { status: 404 }
      );
    }

    // Update seating type
    await seatingType.update(body);

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: 'Seating type updated successfully',
      data: seatingType,
    });
  } catch (error) {
    console.error('Error updating seating type:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: 'Failed to update seating type',
        data: null,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE a seating type by ID
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication with proper permissions
    const adminAuth = await verifyAdmin(req);
    if ('status' in adminAuth) {
      return adminAuth as NextResponse;
    }

    // Check permissions - only super admins should delete seating types
    if (adminAuth.role !== 'super_admin') {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: 'Permission denied: Only super admins can delete seating types',
          data: null,
        },
        { status: 403 }
      );
    }

    const id = params.id;

    // Find the seating type
    const seatingType = await db.SeatingType.findByPk(id);

    if (!seatingType) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: 'Seating type not found',
          data: null,
        },
        { status: 404 }
      );
    }

    // Check if seating type is in use
    const seatCount = await db.Seat.count({
      where: { seating_type_id: id }
    });

    if (seatCount > 0) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: 'Cannot delete seating type that is still assigned to seats',
          data: null,
        },
        { status: 400 }
      );
    }

    // Delete seating type
    await seatingType.destroy();

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: 'Seating type deleted successfully',
      data: null,
    });
  } catch (error) {
    console.error('Error deleting seating type:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: 'Failed to delete seating type',
        data: null,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
} 
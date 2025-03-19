// src/app/api/branches/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { ApiResponse } from '@/types/common';
import { BRANCH_FULL_ATTRIBUTES, SEAT_ATTRIBUTES } from '@/utils/modelAttributes';

// GET a single branch by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;
    
    // Find the branch with its seats, using explicit attributes to avoid alias issues
    const branch = await models.Branch.findByPk(parseInt(id), {
      attributes: BRANCH_FULL_ATTRIBUTES,
      include: [
        { 
          model: models.Seat,
          as: 'Seats',
          attributes: SEAT_ATTRIBUTES,
          include: [
            {
              model: models.SeatingType,
              as: 'SeatingType'
            }
          ]
        }
      ]
    });
    
    if (!branch) {
      return NextResponse.json(
        { success: false, message: 'Branch not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: branch
    });
  } catch (error) {
    console.error('Error fetching branch:', error);
    
    return NextResponse.json(
      { success: false, message: 'Failed to fetch branch', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT update a branch
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;
    const body = await request.json();
    const { 
      name, 
      location, 
      address, 
      latitude, 
      longitude, 
      cost_multiplier, 
      opening_time, 
      closing_time,
      images,
      amenities
    } = body;
    
    // Find the branch with explicit attributes
    const branch = await models.Branch.findByPk(parseInt(id), {
      attributes: BRANCH_FULL_ATTRIBUTES
    });
    
    if (!branch) {
      return NextResponse.json(
        { success: false, message: 'Branch not found' },
        { status: 404 }
      );
    }
    
    // Update branch details
    const updateData: any = {};
    
    if (name) updateData.name = name;
    if (location) updateData.location = location;
    if (address) updateData.address = address;
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;
    if (cost_multiplier !== undefined) updateData.cost_multiplier = cost_multiplier;
    if (opening_time) updateData.opening_time = opening_time;
    if (closing_time) updateData.closing_time = closing_time;
    if (images !== undefined) updateData.images = images;
    if (amenities !== undefined) updateData.amenities = amenities;
    
    await branch.update(updateData);
    
    return NextResponse.json({
      success: true,
      message: 'Branch updated successfully',
      data: branch
    });
  } catch (error) {
    console.error('Error updating branch:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update branch', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE a branch
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;
    
    // Find the branch with explicit attributes
    const branch = await models.Branch.findByPk(parseInt(id), {
      attributes: BRANCH_FULL_ATTRIBUTES
    });
    
    if (!branch) {
      return NextResponse.json(
        { success: false, message: 'Branch not found' },
        { status: 404 }
      );
    }
    
    // Check if branch has seats
    const seatCount = await models.Seat.count({ where: { branch_id: parseInt(id) } });
    
    if (seatCount > 0) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete branch with active seats' },
        { status: 400 }
      );
    }
    
    // Delete the branch
    await branch.destroy();
    
    return NextResponse.json({
      success: true,
      message: 'Branch deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting branch:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete branch', error: (error as Error).message },
      { status: 500 }
    );
  }
}
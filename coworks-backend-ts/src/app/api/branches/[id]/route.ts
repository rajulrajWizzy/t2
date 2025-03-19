// src/app/api/branches/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { ApiResponse } from '@/types/common';

// GET a single branch by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;
    
    // Define safe attributes to fetch that are known to exist
    const safeAttributes = ['id', 'name', 'address', 'location', 'latitude', 'longitude', 
      'cost_multiplier', 'opening_time', 'closing_time', 'is_active', 'created_at', 'updated_at'];
    
    // Find the branch with its seats
    const branch = await models.Branch.findByPk(parseInt(id), {
      attributes: safeAttributes,
      include: [
        { 
          model: models.Seat,
          as: 'Seats',
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
    
    // Now try to fetch optional attributes that might not exist in the schema
    try {
      // Try to fetch images and amenities columns if they exist
      const extendedAttributes = await models.Branch.findByPk(parseInt(id), {
        attributes: ['images', 'amenities', 'short_code'],
        raw: true
      });
      
      if (extendedAttributes) {
        // Add each extended attribute if it exists
        if (extendedAttributes.images !== undefined) {
          branch.dataValues.images = extendedAttributes.images;
        }
        
        if (extendedAttributes.amenities !== undefined) {
          branch.dataValues.amenities = extendedAttributes.amenities;
        }
        
        if (extendedAttributes.short_code !== undefined) {
          branch.dataValues.short_code = extendedAttributes.short_code;
        }
      }
    } catch (err) {
      // If the columns don't exist, just continue without them
      const error = err as Error;
      console.warn('Some extended attributes might not exist in the schema:', error.message);
    }
    
    return NextResponse.json({
      success: true,
      data: branch
    });
  } catch (err) {
    const error = err as Error;
    console.error('Error fetching branch:', error);
    
    // If there's a schema error, try a simpler approach
    if (error.message && (
        error.message.includes('column p.amenities does not exist') ||
        error.message.includes('column p.images does not exist') ||
        error.message.includes('does not exist')
    )) {
      try {
        // Get the id from params again
        const branchId = parseInt(params.id);
        
        // Fallback to simpler query with minimal attributes
        const simpleBranch = await models.Branch.findByPk(branchId, {
          attributes: ['id', 'name', 'address', 'location', 'is_active'],
          include: [
            { 
              model: models.Seat,
              as: 'Seats',
              attributes: ['id', 'seat_number']
            }
          ]
        });
        
        if (!simpleBranch) {
          return NextResponse.json(
            { success: false, message: 'Branch not found' },
            { status: 404 }
          );
        }
        
        return NextResponse.json({
          success: true,
          data: simpleBranch
        });
      } catch (fallbackErr) {
        const fallbackError = fallbackErr as Error;
        console.error('Fallback query also failed:', fallbackError);
      }
    }
    
    return NextResponse.json(
      { success: false, message: 'Failed to fetch branch', error: error.message },
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
    
    // Find the branch
    const branch = await models.Branch.findByPk(parseInt(id));
    
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
    
    // Only include optional columns if they're both provided and the column exists
    try {
      // Check if images column exists before setting it
      if (images !== undefined) {
        await models.Branch.findOne({ attributes: ['images'], limit: 1 });
        updateData.images = images;
      }
    } catch (err) {
      const error = err as Error;
      console.warn('Could not set images, column might not exist in database:', error.message);
    }
    
    try {
      // Check if amenities column exists before setting it
      if (amenities !== undefined) {
        await models.Branch.findOne({ attributes: ['amenities'], limit: 1 });
        updateData.amenities = amenities;
      }
    } catch (err) {
      const error = err as Error;
      console.warn('Could not set amenities, column might not exist in database:', error.message);
    }
    
    await branch.update(updateData);
    
    return NextResponse.json({
      success: true,
      message: 'Branch updated successfully',
      data: branch
    });
  } catch (err) {
    const error = err as Error;
    console.error('Error updating branch:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update branch', error: error.message },
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
    
    // Find the branch
    const branch = await models.Branch.findByPk(parseInt(id));
    
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
  } catch (err) {
    const error = err as Error;
    console.error('Error deleting branch:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete branch', error: error.message },
      { status: 500 }
    );
  }
}
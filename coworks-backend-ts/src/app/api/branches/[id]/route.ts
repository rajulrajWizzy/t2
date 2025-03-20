// src/app/api/branches/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { ApiResponse } from '@/types/common';
import { Op } from 'sequelize';

// Helper function to find branch by ID or code
async function findBranch(idOrCode: string) {
  // Check if the parameter is a numeric ID or a branch code
  const isNumeric = /^\d+$/.test(idOrCode);
  
  // Define safe attributes that are known to exist
  const safeAttributes = ['id', 'name', 'address', 'location', 'latitude', 'longitude', 
    'cost_multiplier', 'opening_time', 'closing_time', 'is_active', 'created_at', 'updated_at', 'short_code'];
  
  let whereClause = {};
  if (isNumeric) {
    whereClause = { id: parseInt(idOrCode) };
  } else {
    whereClause = { short_code: idOrCode };
  }
  
  // Try to find the branch
  const branch = await models.Branch.findOne({
    where: whereClause,
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
  
  return branch;
}

// GET a single branch by ID or code
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
    
    // Now try to fetch optional attributes that might not exist in the schema
    try {
      // Try to fetch images and amenities columns if they exist
      const extendedAttributes = await models.Branch.findOne({
        where: { id: branch.id },
        attributes: ['images', 'amenities'],
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
      }
    } catch (err) {
      // If the columns don't exist, just continue without them
      const error = err as Error;
      console.warn('Some extended attributes might not exist in the schema:', error.message);
    }
    
    // Count total seats for this branch
    const totalSeats = await models.Seat.count({
      where: { branch_id: branch.id }
    });
    
    // Add total seats to the response
    branch.dataValues.total_seats = totalSeats;
    
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
        // Fallback to simpler query with minimal attributes
        const isNumeric = /^\d+$/.test(params.id);
        let whereClause = {};
        
        if (isNumeric) {
          whereClause = { id: parseInt(params.id) };
        } else {
          whereClause = { short_code: params.id };
        }
        
        const simpleBranch = await models.Branch.findOne({
          where: whereClause,
          attributes: ['id', 'name', 'address', 'location', 'is_active'],
          include: [
            { 
              model: models.Seat,
              as: 'Seats',
              attributes: ['id', 'seat_number', 'seat_code']
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

// PUT update a branch by ID or code
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
    
    // Find branch using the helper function
    const branch = await findBranch(id);
    
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

// DELETE a branch by ID or code
export async function DELETE(
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
    
    // Check if branch has seats
    const seatCount = await models.Seat.count({ where: { branch_id: branch.id } });
    
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
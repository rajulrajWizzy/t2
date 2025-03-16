// src/app/api/branches/route.ts
import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyToken } from '@/config/jwt';
import { ApiResponse } from '@/types/common';

// GET all branches
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Fetch all branches
    const branches = await models.Branch.findAll({
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
    
    const response: ApiResponse = {
      success: true,
      data: branches
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching branches:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to fetch branches',
      error: (error as Error).message
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

// POST create a new branch
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse the request body
    const body = await request.json();
    const { 
      name, 
      address, 
      location, 
      latitude, 
      longitude, 
      cost_multiplier, 
      opening_time, 
      closing_time,
      images,
      amenities
    } = body;
    
    // Basic validation
    if (!name || !address || !location) {
      return NextResponse.json({
        success: false,
        message: 'Name, address, and location are required'
      }, { status: 400 });
    }
    
    // Create a new branch
    const branch = await models.Branch.create({
      name,
      address,
      location,
      latitude: latitude || null,
      longitude: longitude || null,
      cost_multiplier: cost_multiplier || 1.00,
      opening_time: opening_time || '08:00:00',
      closing_time: closing_time || '22:00:00',
      images: images || undefined,
      amenities: amenities || null
    });
    
    const response: ApiResponse = {
      success: true,
      message: 'Branch created successfully',
      data: branch
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating branch:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to create branch',
      error: (error as Error).message
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}
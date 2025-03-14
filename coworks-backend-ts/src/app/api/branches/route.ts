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
      code,
      address, 
      city,
      state,
      country,
      postal_code,
      phone,
      email,
      latitude, 
      longitude, 
      cost_multiplier, 
      opening_time, 
      closing_time,
      capacity,
      operating_hours,
      is_active,
      images,
      amenities
    } = body;
    
    // Basic validation
    if (!name || !address) {
      return NextResponse.json({
        success: false,
        message: 'Name and address are required'
      }, { status: 400 });
    }
    
    // Create a new branch
    const branch = await models.Branch.create({
      name,
      code: code || name.substring(0, 3).toUpperCase(),
      address,
      city: city || '',
      state: state || '',
      country: country || '',
      postal_code: postal_code || '',
      phone: phone || '',
      email: email || '',
      capacity: capacity || 0,
      operating_hours: operating_hours || `${opening_time || '09:00'} - ${closing_time || '17:00'}`,
      is_active: is_active !== undefined ? is_active : true,
      // Additional fields that might be part of your extended model:
      ...(latitude !== undefined && { latitude }),
      ...(longitude !== undefined && { longitude }),
      ...(cost_multiplier !== undefined && { cost_multiplier }),
      ...(images !== undefined && { images }),
      ...(amenities !== undefined && { amenities })
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
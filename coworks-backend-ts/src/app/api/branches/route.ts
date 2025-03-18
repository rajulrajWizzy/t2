// src/app/api/branches/route.ts
import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyToken } from '@/config/jwt';
import { ApiResponse } from '@/types/common';
import validation from '@/utils/validation';
import { Branch } from '@/types/branch';

// GET all branches
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Unauthorized',
        data: null
      }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Unauthorized',
        data: null
      }, { status: 401 });
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
    
    // No need to add short codes manually as they are now in the database
    const response: ApiResponse<Branch[]> = {
      success: true,
      message: 'Branches retrieved successfully',
      data: branches
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching branches:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      message: 'Failed to fetch branches',
      data: null
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
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Unauthorized',
        data: null
      }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Unauthorized',
        data: null
      }, { status: 401 });
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
      amenities,
      short_code 
    } = body;
    
    // Basic validation
    if (!name || !address || !location) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Name, address, and location are required',
        data: null
      }, { status: 400 });
    }
    
    // Name validation - check for blank or whitespace-only names
    if (!validation.isValidName(name)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Name cannot be empty or contain only whitespace',
        data: null
      }, { status: 400 });
    }
    
    // Create branch
    const branch = await models.Branch.create({
      name,
      address,
      location,
      latitude: latitude || null,
      longitude: longitude || null,
      cost_multiplier: cost_multiplier || 1.0,
      opening_time: opening_time || '09:00:00',
      closing_time: closing_time || '18:00:00',
      images: images || [],
      amenities: amenities || null,
      short_code: short_code || null
    });
    
    const response: ApiResponse<Branch> = {
      success: true,
      message: 'Branch created successfully',
      data: branch
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating branch:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      message: 'Failed to create branch',
      data: null
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}
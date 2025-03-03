import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyToken } from '@/config/jwt';
import { BranchInput } from '@/types/branch';
import { ApiResponse } from '@/types/common';

// GET all branches
export async function GET(): Promise<NextResponse> {
  try {
    const branches = await models.Branch.findAll({
      where: { is_active: true },
      attributes: [
        'id', 'name', 'address', 'location', 'latitude', 'longitude', 
        'cost_multiplier', 'opening_time', 'closing_time'
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
      const response: ApiResponse = {
        success: false,
        message: 'Unauthorized'
      };
      
      return NextResponse.json(response, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = verifyToken(token);
    if (!valid || !decoded) {
      const response: ApiResponse = {
        success: false,
        message: 'Unauthorized'
      };
      
      return NextResponse.json(response, { status: 401 });
    }
    
    // Parse the request body
    const body = await request.json() as BranchInput;
    const { 
      name, address, location, latitude, longitude,
      cost_multiplier, opening_time, closing_time 
    } = body;
    
    // Validate input
    if (!name || !address || !location) {
      const response: ApiResponse = {
        success: false,
        message: 'Name, address, and location are required'
      };
      
      return NextResponse.json(response, { status: 400 });
    }
    
    // Create a new branch
    const branch = await models.Branch.create({
      name,
      address,
      location,
      latitude: latitude || undefined,
      longitude: longitude || undefined,
      cost_multiplier: cost_multiplier || 1.00,
      opening_time: opening_time || '08:00:00',
      closing_time: closing_time || '22:00:00',
      is_active: true
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
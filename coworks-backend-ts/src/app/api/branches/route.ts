// src/app/api/branches/route.ts
import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyToken } from '@/config/jwt';
import { ApiResponse } from '@/types/common';
import validation from '@/utils/validation';

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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const seatingTypeId = searchParams.get('seating_type_id');
    
    // Get pagination parameters with defaults
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50'); // Default limit of 50, can be increased
    const offset = (page - 1) * limit;
    
    // Prepare base query
    const query: any = {
      offset,
      limit,
      attributes: {
        include: ['id', 'name', 'address', 'location', 'latitude', 'longitude', 
                 'cost_multiplier', 'opening_time', 'closing_time', 'is_active', 
                 'images', 'amenities', 'short_code', 'created_at', 'updated_at']
      }
    };
    
    // Add relationship includes
    if (seatingTypeId) {
      // If seating_type_id is provided, get only branches that have seats of that type
      query.include = [
        {
          model: models.Seat,
          as: 'Seats',
          where: { seating_type_id: seatingTypeId },
          required: true,
          include: [
            {
              model: models.SeatingType,
              as: 'SeatingType'
            }
          ]
        }
      ];
    } else {
      // If no seating_type_id, get all branches
      query.include = [
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
      ];
    }
    
    // Get total count for pagination
    const count = await models.Branch.count({
      ...(seatingTypeId ? {
        include: [
          {
            model: models.Seat,
            as: 'Seats',
            where: { seating_type_id: seatingTypeId },
            required: true
          }
        ]
      } : {})
    });
    
    // Execute query with pagination
    const branches = await models.Branch.findAll(query);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(count / limit);
    const hasMore = page < totalPages;
    const hasNext = page < totalPages;
    const hasPrev = page > 1;
    
    // Return paginated response
    const response: ApiResponse = {
      success: true,
      data: branches,
      meta: {
        pagination: {
          total: count,
          page,
          limit,
          pages: totalPages,
          hasMore,
          hasNext,
          hasPrev
        }
      }
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
    
    // Name validation - check for blank or whitespace-only names
    if (!validation.isValidName(name)) {
      return NextResponse.json({
        success: false,
        message: 'Name cannot be empty or contain only whitespace'
      }, { status: 400 });
    }

    // Generate a unique short code from the branch name
    // Format: First 3 letters of name + 3 random chars
    const namePrefix = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 3)
      .toUpperCase();
    
    const randomChars = Math.random().toString(36).substring(2, 5).toUpperCase();
    const shortCode = `${namePrefix}${randomChars}`;
    
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
      images: images || null,
      amenities: amenities || null,
      short_code: shortCode
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
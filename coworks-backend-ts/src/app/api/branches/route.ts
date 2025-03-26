<<<<<<< Updated upstream
// src/app/api/branches/route.ts
=======
// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

>>>>>>> Stashed changes
import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyToken } from '@/utils/jwt';
import { ApiResponse } from '@/types/common';
import validation from '@/utils/validation';
import { Op } from 'sequelize';
import { Branch } from '@/types/branch';
import { Seat } from '@/types/seating';

// Interface for Branch with associations
interface BranchWithAssociations extends Branch {
  Seats?: Seat[];
  seating_types?: any[];
  total_seats?: number;
}

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
    const seatingTypeCode = searchParams.get('seating_type_code');
    
    // Get pagination parameters with defaults
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50'); // Default limit of 50, can be increased
    const offset = (page - 1) * limit;
    
    // Prepare base query
    const query: any = {
      offset,
      limit,
      attributes: [
        'id', 'name', 'address', 'location', 'latitude', 'longitude',
        'cost_multiplier', 'opening_time', 'closing_time', 'is_active', 
        'created_at', 'updated_at', 'short_code'
      ]
    };
    
    // Determine seating type filter condition
    let seatingTypeCondition = {};
    if (seatingTypeId) {
      seatingTypeCondition = { id: seatingTypeId };
    } else if (seatingTypeCode) {
      seatingTypeCondition = { short_code: seatingTypeCode };
    }
    
    // Add relationship includes
    if (Object.keys(seatingTypeCondition).length > 0) {
      // If seating type filter is provided, get only branches that have seats of that type
      query.include = [
        {
          model: models.Seat,
          as: 'Seats',
          include: [
            {
              model: models.SeatingType,
              as: 'SeatingType',
              where: seatingTypeCondition
            }
          ],
          required: true
        }
      ];
    } else {
      // If no seating type filter, get all branches
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
      ...(Object.keys(seatingTypeCondition).length > 0 ? {
        include: [
          {
            model: models.Seat,
            as: 'Seats',
            include: [
              {
                model: models.SeatingType,
                as: 'SeatingType',
                where: seatingTypeCondition
              }
            ],
            required: true
          }
        ]
      } : {})
    });
    
    // Execute query with pagination
    const branches = await models.Branch.findAll(query);
    
    // Process branches to organize seats by seating type
    const processedBranches = branches.map(branch => {
      const branchData = branch.toJSON() as BranchWithAssociations;
      const seatingTypeMap = new Map();
      
      // Group seats by seating type
      if (branchData.Seats && branchData.Seats.length > 0) {
        branchData.Seats.forEach(seat => {
          if ((seat as any).SeatingType) {
            const currentSeatingType = (seat as any).SeatingType;
            const currentSeatingTypeId = currentSeatingType.id.toString();
            
            // If seating type filter is applied, only include matching seating type
            if (seatingTypeId && currentSeatingTypeId !== seatingTypeId.toString()) {
              return; // Skip this seating type
            }
            
            if (seatingTypeCode && currentSeatingType.short_code !== seatingTypeCode) {
              return; // Skip this seating type
            }
            
            // Add this seating type to the map
            if (!seatingTypeMap.has(currentSeatingTypeId)) {
              seatingTypeMap.set(currentSeatingTypeId, {
                ...currentSeatingType,
                seats: [],
                seat_count: 0
              });
            }
            
            seatingTypeMap.get(currentSeatingTypeId).seats.push(seat);
            seatingTypeMap.get(currentSeatingTypeId).seat_count++;
          }
        });
      }
      
      // Replace seats array with seating types array
      branchData.seating_types = Array.from(seatingTypeMap.values());
      branchData.total_seats = branchData.Seats ? branchData.Seats.length : 0;
      delete branchData.Seats;
      
      return branchData;
    });
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(count / limit);
    const hasMore = page < totalPages;
    const hasNext = page < totalPages;
    const hasPrev = page > 1;
    
    // Return paginated response
    const response = {
      success: true,
      message: 'Branches retrieved successfully',
      data: processedBranches,
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
    
    // Check if the error is related to a missing column
    const errorMessage = (error as Error).message;
    if (errorMessage.includes('column p.images does not exist') || 
        errorMessage.includes('column') || 
        errorMessage.includes('does not exist')) {
      
      // Try again with a more basic query that avoids the problematic column
      try {
        // Get query parameters
        const { searchParams } = new URL(request.url);
        const seatingTypeId = searchParams.get('seating_type_id');
        const seatingTypeCode = searchParams.get('seating_type_code');
        
        // Get pagination parameters with defaults
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = (page - 1) * limit;
        
        // Determine seating type filter condition
        let seatingTypeCondition = {};
        if (seatingTypeId) {
          seatingTypeCondition = { id: seatingTypeId };
        } else if (seatingTypeCode) {
          seatingTypeCondition = { short_code: seatingTypeCode };
        }
        
        // Use a simpler query that doesn't rely on potentially missing columns
        const basicQuery: any = {
          attributes: ['id', 'name', 'address', 'location', 'is_active', 'created_at', 'updated_at', 'short_code'],
          offset,
          limit
        };
        
        if (Object.keys(seatingTypeCondition).length > 0) {
          basicQuery.include = [
            {
              model: models.Seat,
              as: 'Seats',
              attributes: ['id', 'seat_number', 'seat_code'],
              include: [
                {
                  model: models.SeatingType,
                  as: 'SeatingType',
                  where: seatingTypeCondition,
                  attributes: ['id', 'name', 'short_code']
                }
              ],
              required: true
            }
          ];
        }
        
        const count = await models.Branch.count({
          ...(Object.keys(seatingTypeCondition).length > 0 ? {
            include: [
              {
                model: models.Seat,
                as: 'Seats',
                include: [
                  {
                    model: models.SeatingType,
                    as: 'SeatingType',
                    where: seatingTypeCondition
                  }
                ],
                required: true
              }
            ]
          } : {})
        });
        
        const branches = await models.Branch.findAll(basicQuery);
        
        // Process branches to organize seats by seating type (simplified version)
        const processedBranches = branches.map(branch => {
          const branchData = branch.toJSON() as BranchWithAssociations;
          const seatingTypeMap = new Map();
          
          // Group seats by seating type (if seats are present)
          if (branchData.Seats && branchData.Seats.length > 0) {
            branchData.Seats.forEach(seat => {
              if ((seat as any).SeatingType) {
                const seatingTypeId = (seat as any).SeatingType.id;
                if (!seatingTypeMap.has(seatingTypeId)) {
                  seatingTypeMap.set(seatingTypeId, {
                    ...(seat as any).SeatingType,
                    seats: [],
                    seat_count: 0
                  });
                }
                seatingTypeMap.get(seatingTypeId).seats.push(seat);
                seatingTypeMap.get(seatingTypeId).seat_count++;
              }
            });
          }
          
          // Replace seats array with seating types array
          branchData.seating_types = Array.from(seatingTypeMap.values());
          branchData.total_seats = branchData.Seats ? branchData.Seats.length : 0;
          delete branchData.Seats;
          
          return branchData;
        });
        
        const totalPages = Math.ceil(count / limit);
        
        const fallbackResponse = {
          success: true,
          message: 'Branches retrieved successfully',
          data: processedBranches,
          meta: {
            pagination: {
              total: count,
              page,
              limit,
              pages: totalPages,
              hasMore: page < totalPages,
              hasNext: page < totalPages,
              hasPrev: page > 1
            }
          }
        };
        
        return NextResponse.json(fallbackResponse);
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
      }
    }
    
    const errorResponse = {
      success: false,
      message: 'Failed to fetch branches',
      data: null,
      error: (error as Error).message
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
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
    
    // Create a branch object with all fields
    const branchData: any = {
      name,
      address,
      location,
      latitude: latitude || null,
      longitude: longitude || null,
      cost_multiplier: cost_multiplier || 1.00,
      opening_time: opening_time || '08:00:00',
      closing_time: closing_time || '22:00:00'
    };
    
    // Only add fields that might not exist in the schema if they are provided
    if (images !== undefined) {
      branchData.images = images;
    }
    
    if (amenities !== undefined) {
      branchData.amenities = amenities;
    }
    
    try {
      branchData.short_code = shortCode;
    } catch (err) {
      console.warn('Could not set short_code, column might not exist in database');
    }
    
    // Create a new branch
    const branch = await models.Branch.create(branchData);
    
    const response = {
      success: true,
      message: 'Branch created successfully',
      data: branch
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating branch:', error);
    
    const response = {
      success: false,
      message: 'Failed to create branch',
      data: null,
      error: (error as Error).message
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}
// src/app/api/branches/route.ts
import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyToken } from '@/config/jwt';
import { ApiResponse } from '@/types/common';
import validation from '@/utils/validation';
import { Op } from 'sequelize';
import { BRANCH_FULL_ATTRIBUTES, SEAT_ATTRIBUTES, SEATING_TYPE_ATTRIBUTES } from '@/utils/modelAttributes';

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
    const branchShortCode = searchParams.get('branch_code');
    
    // Get pagination parameters with defaults
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50'); // Default limit of 50, can be increased
    const offset = (page - 1) * limit;
    
    // Find seating type ID from code if code is provided
    let seatingTypeIdToUse = seatingTypeId;
    if (seatingTypeCode && !seatingTypeId) {
      const seatingType = await models.SeatingType.findOne({
        where: { short_code: seatingTypeCode }
      });
      
      if (seatingType) {
        seatingTypeIdToUse = seatingType.id.toString();
      }
    }
    
    // Prepare query options
    let whereCondition = {};
    
    // Add branch filter if short code is provided
    if (branchShortCode) {
      whereCondition = {
        short_code: branchShortCode
      };
    }
    
    // Different approach for filtered vs unfiltered query
    if (seatingTypeIdToUse) {
      // When filtering by seating type, first find branch IDs that have the seating type
      const seatsWithType = await models.Seat.findAll({
        attributes: ['branch_id'],
        where: { seating_type_id: seatingTypeIdToUse },
        group: ['branch_id']
      });
      
      const branchIds = seatsWithType.map(seat => seat.branch_id);
      
      if (branchIds.length === 0) {
        // No branches have this seating type
        return NextResponse.json({
          success: true,
          data: [],
          meta: {
            pagination: {
              total: 0,
              page,
              limit,
              pages: 0,
              hasMore: false,
              hasNext: false,
              hasPrev: page > 1
            }
          }
        });
      }
      
      // Add branch IDs to the where condition
      whereCondition = {
        ...whereCondition,
        id: {
          [Op.in]: branchIds
        }
      };
      
      // Get total count for pagination
      const count = await models.Branch.count({
        where: whereCondition
      });
      
      // Fetch branches with the seating type
      const branches = await models.Branch.findAll({
        where: whereCondition,
        attributes: BRANCH_FULL_ATTRIBUTES,
        include: [
          {
            model: models.Seat,
            as: 'Seats',
            attributes: SEAT_ATTRIBUTES,
            where: { seating_type_id: seatingTypeIdToUse },
            include: [
              {
                model: models.SeatingType,
                as: 'SeatingType',
                attributes: SEATING_TYPE_ATTRIBUTES
              }
            ]
          }
        ],
        offset,
        limit
      });
      
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
    } else {
      // No seating type filter, so simple query
      const count = await models.Branch.count({
        where: whereCondition
      });
      
      const branches = await models.Branch.findAll({
        where: whereCondition,
        attributes: BRANCH_FULL_ATTRIBUTES,
        include: [
          {
            model: models.Seat,
            as: 'Seats',
            attributes: SEAT_ATTRIBUTES,
            include: [
              {
                model: models.SeatingType,
                as: 'SeatingType',
                attributes: SEATING_TYPE_ATTRIBUTES
              }
            ]
          }
        ],
        offset,
        limit
      });
      
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
    }
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
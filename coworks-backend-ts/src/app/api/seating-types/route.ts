// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

// Explicitly set Node.js runtime for this route

// Explicitly set Node.js runtime for this route

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, corsHeaders } from '@/utils/jwt-wrapper';
import { SeatingType, SeatingTypeInput } from '@/types/seating';
import { ApiResponse } from '@/types/common';
import validation from '@/utils/validation';
import { requireAuth } from '@/app/api/middleware/requireAuth';
import models from '@/models';
import { Op } from 'sequelize';

interface MockSeatingType extends Omit<SeatingType, 'name' | 'capacity_options' | 'quantity_options' | 'cost_multiplier' | 'created_at' | 'updated_at'> {
  name: string;
  is_daily?: boolean;
  is_weekly?: boolean;
  is_monthly?: boolean;
  min_booking_duration_unit?: 'hour' | 'day' | 'week' | 'month';
  max_seats?: number;
  image_url?: string;
  amenities?: string[];
  capacity_options: number[];
  quantity_options: number[];
  cost_multiplier: number;
  created_at: Date;
  updated_at: Date;
}

// Generate mock seating types
const generateMockSeatingTypes = (): MockSeatingType[] => {
  const seatingTypes: MockSeatingType[] = [
    {
      id: 1,
      name: "Hot Desk",
      short_code: "HOT_DESK",
      description: "Flexible workstations available on a first-come, first-served basis.",
      hourly_rate: 10,
      daily_rate: 50,
      weekly_rate: 250,
      monthly_rate: 800,
      is_hourly: true,
      is_daily: true,
      is_weekly: true,
      is_monthly: true,
      min_booking_duration: 1,
      min_booking_duration_unit: 'hour',
      min_seats: 1,
      max_seats: 1,
      base_price: 10,
      capacity: 1,
      capacity_options: [1],
      quantity_options: [1],
      cost_multiplier: 1,
      is_meeting_room: false,
      is_active: true,
      image_url: "https://example.com/seating-types/hot-desk.jpg",
      amenities: ["High-speed WiFi", "Power outlets", "Adjustable chair"],
      created_at: new Date("2022-01-01T10:00:00.000Z"),
      updated_at: new Date("2023-05-15T14:30:00.000Z")
    },
    {
      id: 2,
      name: "Dedicated Desk",
      short_code: "DEDICATED_DESK",
      description: "Your own personal desk, reserved exclusively for you.",
      hourly_rate: 0,
      daily_rate: 0,
      weekly_rate: 400,
      monthly_rate: 1200,
      is_hourly: false,
      is_daily: false,
      is_weekly: true,
      is_monthly: true,
      min_booking_duration: 1,
      min_booking_duration_unit: 'week',
      min_seats: 1,
      max_seats: 1,
      base_price: 400,
      capacity: 1,
      capacity_options: [1],
      quantity_options: [1],
      cost_multiplier: 1,
      is_meeting_room: false,
      is_active: true,
      image_url: "https://example.com/seating-types/dedicated-desk.jpg",
      amenities: ["Lockable storage", "Ergonomic chair", "High-speed WiFi", "Dual monitor setup"],
      created_at: new Date("2022-01-01T10:15:00.000Z"),
      updated_at: new Date("2023-06-20T11:45:00.000Z")
    },
    {
      id: 3,
      name: "Private Office",
      short_code: "PRIVATE_OFFICE",
      description: "Private, enclosed office space for teams of various sizes.",
      hourly_rate: 0,
      daily_rate: 0,
      weekly_rate: 1200,
      monthly_rate: 4000,
      is_hourly: false,
      is_daily: false,
      is_weekly: true,
      is_monthly: true,
      min_booking_duration: 1,
      min_booking_duration_unit: 'month',
      min_seats: 4,
      max_seats: 20,
      base_price: 4000,
      capacity: 20,
      capacity_options: [4, 6, 8, 10, 12, 15, 20],
      quantity_options: [4, 6, 8, 10, 12, 15, 20],
      cost_multiplier: 1.5,
      is_meeting_room: false,
      is_active: true,
      image_url: "https://example.com/seating-types/private-office.jpg",
      amenities: ["Private entrance", "Whiteboard", "Smart TV", "High-speed WiFi", "Soundproofing"],
      created_at: new Date("2022-01-01T10:30:00.000Z"),
      updated_at: new Date("2023-07-10T09:20:00.000Z")
    },
    {
      id: 4,
      name: "Meeting Room",
      short_code: "MEETING_ROOM",
      description: "Professional meeting spaces for client meetings, presentations, and team collaborations.",
      hourly_rate: 50,
      daily_rate: 300,
      weekly_rate: 0,
      monthly_rate: 0,
      is_hourly: true,
      is_daily: true,
      is_weekly: false,
      is_monthly: false,
      min_booking_duration: 1,
      min_booking_duration_unit: 'hour',
      min_seats: 6,
      max_seats: 20,
      base_price: 50,
      capacity: 20,
      capacity_options: [6, 8, 10, 12, 16, 20],
      quantity_options: [6, 8, 10, 12, 16, 20],
      cost_multiplier: 1.2,
      is_meeting_room: true,
      is_active: true,
      image_url: "https://example.com/seating-types/meeting-room.jpg",
      amenities: ["Video conferencing", "Smart TV", "Whiteboard", "Coffee service", "High-speed WiFi"],
      created_at: new Date("2022-01-01T10:45:00.000Z"),
      updated_at: new Date("2023-08-05T16:10:00.000Z")
    },
    {
      id: 5,
      name: "Event Space",
      short_code: "EVENT_SPACE",
      description: "Open-concept areas ideal for workshops, seminars, and networking events.",
      hourly_rate: 200,
      daily_rate: 1000,
      weekly_rate: 0,
      monthly_rate: 0,
      is_hourly: true,
      is_daily: true,
      is_weekly: false,
      is_monthly: false,
      min_booking_duration: 4,
      min_booking_duration_unit: 'hour',
      min_seats: 30,
      max_seats: 100,
      base_price: 200,
      capacity: 100,
      capacity_options: [30, 50, 75, 100],
      quantity_options: [30, 50, 75, 100],
      cost_multiplier: 1.5,
      is_meeting_room: true,
      is_active: true,
      image_url: "https://example.com/seating-types/event-space.jpg",
      amenities: ["AV equipment", "Stage area", "Catering options", "High-speed WiFi", "Flexible seating arrangements"],
      created_at: new Date("2022-01-01T11:00:00.000Z"),
      updated_at: new Date("2023-09-15T13:25:00.000Z")
    }
  ];
  
  return seatingTypes;
};

// GET all seating types
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('Seating Types API GET called');

    // Check authentication
    const authError = await requireAuth(request);
    if (authError) {
      return authError;
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const seatingTypeId = searchParams.get('seating_type_id');
    const shortCode = searchParams.get('short_code');
    
    // Try to fetch from database first
    try {
      await models.sequelize.authenticate();
      console.log('Database connection is active for seating-types endpoint');
      
      // Build query conditions
      const whereClause: any = {};
      
      if (search) {
        whereClause.name = {
          [Op.iLike]: `%${search}%`
        };
      }

      if (seatingTypeId) {
        // If seating_type_id is provided, return specific seating type
        const seatingType = await models.SeatingType.findByPk(seatingTypeId);
        
        if (!seatingType) {
          return NextResponse.json(
            { 
              success: false, 
              message: `Seating type with ID ${seatingTypeId} not found`,
              data: null
            },
            { status: 404, headers: corsHeaders }
          );
        }
        
        return NextResponse.json(
          { 
            success: true, 
            message: 'Seating type retrieved successfully', 
            data: seatingType 
          },
          { status: 200, headers: corsHeaders }
        );
      }
      
      if (shortCode) {
        // If short_code is provided, return specific seating type
        const seatingType = await models.SeatingType.findOne({
          where: { short_code: shortCode }
        });
        
        if (!seatingType) {
          return NextResponse.json(
            { 
              success: false, 
              message: `Seating type with short code ${shortCode} not found`,
              data: null
            },
            { status: 404, headers: corsHeaders }
          );
        }
        
        return NextResponse.json(
          { 
            success: true, 
            message: 'Seating type retrieved successfully', 
            data: seatingType 
          },
          { status: 200, headers: corsHeaders }
        );
      }
      
      // Fetch all seating types with pagination
      const { count, rows: seatingTypes } = await models.SeatingType.findAndCountAll({
        where: whereClause,
        limit,
        offset: (page - 1) * limit,
        order: [['created_at', 'DESC']]
      });
      
      // Format response to match expected structure
      const responseData = {
        success: true,
        message: 'Seating types retrieved successfully',
        data: {
          seatingTypes,
          pagination: {
            total: count,
            page,
            limit,
            pages: Math.ceil(count / limit)
          }
        }
      };
      
      return NextResponse.json(responseData, { status: 200, headers: corsHeaders });
    } catch (dbError) {
      console.error('Database error in seating-types GET:', dbError);
      console.log('Falling back to mock data');
      // Continue to mock data if database fails
    }
    
    // Fallback to mock data if database is not available
    const mockSeatingTypes = generateMockSeatingTypes();
    
    // Format response to match admin API structure
    const responseData = {
      success: true,
      message: 'Seating types retrieved successfully (mock data)',
      data: {
        seatingTypes: mockSeatingTypes,
        pagination: {
          total: mockSeatingTypes.length,
          page,
          limit,
          pages: Math.ceil(mockSeatingTypes.length / limit)
        }
      }
    };
    
    return NextResponse.json(responseData, { status: 200, headers: corsHeaders });
    
  } catch (error) {
    console.error('Error fetching seating types:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to retrieve seating types',
        error: (error as Error).message,
        data: null
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST create a new seating type
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('Seating Types API POST called');

    // Check authentication
    const authError = await requireAuth(request);
    if (authError) {
      return authError;
    }

    // Parse request body
    const body = await request.json();
    const { 
      name,
      description,
      hourly_rate,
      daily_rate = 0,
      weekly_rate = 0,
      monthly_rate = 0,
      is_hourly = true,
      min_booking_duration = 1,
      min_seats = 1,
      is_meeting_room = false,
      capacity = 1,
      base_price,
      quantity_options,
      cost_multiplier
    } = body;
    
    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Name is required',
          data: null
        },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Try to create in database
    try {
      await models.sequelize.authenticate();
      console.log('Database connection is active for seating-types POST');
      
      // Check if seating type already exists
      const existingType = await models.SeatingType.findOne({
        where: {
          name: { [Op.iLike]: name }
        }
      });
      
      if (existingType) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Seating type with this name already exists',
            data: null
          },
          { status: 409, headers: corsHeaders }
        );
      }
      
      // Generate short code from the name
      const namePrefix = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 3)
        .toUpperCase();
      
      const randomChars = Math.random().toString(36).substring(2, 5).toUpperCase();
      const shortCode = `${namePrefix}${randomChars}`;
      
      // Create the seating type
      const newSeatingType = await models.SeatingType.create({
        name,
        description: description || '',
        hourly_rate: hourly_rate || 0,
        daily_rate: daily_rate || 0,
        weekly_rate: weekly_rate || 0,
        monthly_rate: monthly_rate || 0,
        is_hourly,
        min_booking_duration,
        min_seats,
        short_code: shortCode,
        capacity,
        is_meeting_room,
        is_active: true,
        base_price: base_price || hourly_rate || 0,
        quantity_options: quantity_options || [1, 2, 3, 5, 10],
        cost_multiplier: cost_multiplier || null
      });
      
      return NextResponse.json(
        { 
          success: true, 
          message: 'Seating type created successfully',
          data: newSeatingType
        },
        { status: 201, headers: corsHeaders }
      );
    } catch (dbError) {
      console.error('Database error in seating-types POST:', dbError);
      // Fall back to mock creation
    }
    
    // Fallback to mock data if database is not available
    const mockSeatingTypes = generateMockSeatingTypes();
    
    // Check if a seating type with the same name already exists
    const existingType = mockSeatingTypes.find(type => type.name.toLowerCase() === name.toLowerCase());
    
    if (existingType) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Seating type already exists',
        data: null
      };
      
      return NextResponse.json(response, { status: 409, headers: corsHeaders });
    }

    // Generate a unique short code from the seating type name
    // Format: First 3 letters of name + 3 random chars
    const namePrefix = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 3)
      .toUpperCase();
    
    const randomChars = Math.random().toString(36).substring(2, 5).toUpperCase();
    const shortCode = `${namePrefix}${randomChars}`;
    
    // Create a new seating type (mock implementation)
    const newSeatingType: SeatingType = {
      id: mockSeatingTypes.length + 1,
      name,
      description: description || '',
      hourly_rate: hourly_rate || 0.00,
      is_hourly: is_hourly !== undefined ? is_hourly : true,
      min_booking_duration: min_booking_duration || 2,
      short_code: shortCode,
      daily_rate: daily_rate || 0,
      weekly_rate: weekly_rate || 0,
      monthly_rate: monthly_rate || 0,
      capacity: capacity || 1,
      is_meeting_room: is_meeting_room || false,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const response: ApiResponse<SeatingType> = {
      success: true,
      message: 'Seating type created successfully (mock)',
      data: newSeatingType
    };
    
    return NextResponse.json(response, { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error('Error creating seating type:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to create seating type',
        error: (error as Error).message,
        data: null
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// PUT update a seating type
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('Seating Types API PUT called');

    // Check authentication
    const authError = await requireAuth(request);
    if (authError) {
      return authError;
    }

    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const id = pathSegments[pathSegments.length - 1];
    
    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Seating type ID is required',
          data: null
        },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Parse request body
    const body = await request.json();
    
    // Try to update in database
    try {
      await models.sequelize.authenticate();
      console.log('Database connection is active for seating-types PUT');
      
      // Check if seating type exists
      const seatingType = await models.SeatingType.findByPk(id);
      
      if (!seatingType) {
        return NextResponse.json(
          { 
            success: false, 
            message: `Seating type with ID ${id} not found`,
            data: null
          },
          { status: 404, headers: corsHeaders }
        );
      }
      
      // Update the seating type
      await seatingType.update(body);
      
      // Fetch the updated seating type
      const updatedSeatingType = await models.SeatingType.findByPk(id);
      
      return NextResponse.json(
        { 
          success: true, 
          message: 'Seating type updated successfully',
          data: updatedSeatingType
        },
        { status: 200, headers: corsHeaders }
      );
    } catch (dbError) {
      console.error('Database error in seating-types PUT:', dbError);
      // Fall back to mock update
    }
    
    // Fallback response for mock implementation
    return NextResponse.json(
      { 
        success: true, 
        message: 'Seating type updated successfully (mock)',
        data: { id, ...body }
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error updating seating type:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to update seating type',
        error: (error as Error).message,
        data: null
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// DELETE a seating type
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('Seating Types API DELETE called');

    // Check authentication
    const authError = await requireAuth(request);
    if (authError) {
      return authError;
    }

    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const id = pathSegments[pathSegments.length - 1];
    
    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Seating type ID is required',
          data: null
        },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Try to delete from database
    try {
      await models.sequelize.authenticate();
      console.log('Database connection is active for seating-types DELETE');
      
      // Check if seating type exists
      const seatingType = await models.SeatingType.findByPk(id);
      
      if (!seatingType) {
        return NextResponse.json(
          { 
            success: false, 
            message: `Seating type with ID ${id} not found`,
            data: null
          },
          { status: 404, headers: corsHeaders }
        );
      }
      
      // Delete the seating type
      await seatingType.destroy();
      
      return NextResponse.json(
        { 
          success: true, 
          message: 'Seating type deleted successfully',
          data: null
        },
        { status: 200, headers: corsHeaders }
      );
    } catch (dbError) {
      console.error('Database error in seating-types DELETE:', dbError);
      // Fall back to mock deletion
    }
    
    // Fallback response for mock implementation
    return NextResponse.json(
      { 
        success: true, 
        message: 'Seating type deleted successfully (mock)',
        data: null
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error deleting seating type:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to delete seating type',
        error: (error as Error).message,
        data: null
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  });
}

// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, corsHeaders } from '@/utils/jwt-wrapper';
import models from '@/models';
import { Op } from 'sequelize';

interface Branch {
  id: number;
  name: string;
  short_code: string;
  city: string;
  state: string;
  country: string;
  address: string;
  postal_code: string;
  latitude: number;
  longitude: number;
  phone_number: string;
  email: string;
  opening_hours: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
  amenities: string[];
  is_active: boolean;
  images: string[];
  description: string;
  created_at: string;
  updated_at: string;
}

// Generate mock branch data
const generateMockBranches = (): Branch[] => {
  const branches: Branch[] = [
    {
      id: 1,
      name: "Downtown Branch",
      short_code: "DTB",
      city: "New York",
      state: "NY",
      country: "USA",
      address: "123 Wall Street",
      postal_code: "10005",
      latitude: 40.7055,
      longitude: -74.0088,
      phone_number: "+1 (212) 555-1234",
      email: "downtown@coworks.com",
      opening_hours: {
        monday: "7:00 AM - 9:00 PM",
        tuesday: "7:00 AM - 9:00 PM",
        wednesday: "7:00 AM - 9:00 PM",
        thursday: "7:00 AM - 9:00 PM",
        friday: "7:00 AM - 9:00 PM",
        saturday: "9:00 AM - 6:00 PM",
        sunday: "10:00 AM - 5:00 PM"
      },
      amenities: [
        "High-speed WiFi",
        "Coffee and Tea",
        "Meeting Rooms",
        "Standing Desks",
        "Printing Facilities",
        "Kitchen",
        "Lounge Area",
        "24/7 Access"
      ],
      is_active: true,
      images: [
        "https://example.com/branches/downtown-1.jpg",
        "https://example.com/branches/downtown-2.jpg",
        "https://example.com/branches/downtown-3.jpg"
      ],
      description: "Our flagship location in the heart of the financial district, offering premium workspace solutions with stunning views of the city skyline.",
      created_at: "2022-01-10T08:00:00.000Z",
      updated_at: "2023-06-15T14:30:00.000Z"
    },
    {
      id: 2,
      name: "Uptown Branch",
      short_code: "UTB",
      city: "New York",
      state: "NY",
      country: "USA",
      address: "456 Madison Avenue",
      postal_code: "10022",
      latitude: 40.7616,
      longitude: -73.9718,
      phone_number: "+1 (212) 555-5678",
      email: "uptown@coworks.com",
      opening_hours: {
        monday: "8:00 AM - 8:00 PM",
        tuesday: "8:00 AM - 8:00 PM",
        wednesday: "8:00 AM - 8:00 PM",
        thursday: "8:00 AM - 8:00 PM",
        friday: "8:00 AM - 8:00 PM",
        saturday: "9:00 AM - 5:00 PM",
        sunday: "Closed"
      },
      amenities: [
        "High-speed WiFi",
        "Barista Service",
        "Meeting Rooms",
        "Phone Booths",
        "Printing Facilities",
        "Snack Bar",
        "Wellness Room",
        "Bike Storage"
      ],
      is_active: true,
      images: [
        "https://example.com/branches/uptown-1.jpg",
        "https://example.com/branches/uptown-2.jpg",
        "https://example.com/branches/uptown-3.jpg"
      ],
      description: "A stylish workspace in the prestigious uptown area, designed for professionals who value elegance and convenience.",
      created_at: "2022-03-15T09:30:00.000Z",
      updated_at: "2023-05-20T11:45:00.000Z"
    },
    {
      id: 3,
      name: "Midtown Branch",
      short_code: "MTB",
      city: "New York",
      state: "NY",
      country: "USA",
      address: "789 Fifth Avenue",
      postal_code: "10019",
      latitude: 40.7636,
      longitude: -73.9758,
      phone_number: "+1 (212) 555-9012",
      email: "midtown@coworks.com",
      opening_hours: {
        monday: "7:30 AM - 9:30 PM",
        tuesday: "7:30 AM - 9:30 PM",
        wednesday: "7:30 AM - 9:30 PM",
        thursday: "7:30 AM - 9:30 PM",
        friday: "7:30 AM - 9:30 PM",
        saturday: "8:00 AM - 7:00 PM",
        sunday: "9:00 AM - 5:00 PM"
      },
      amenities: [
        "High-speed WiFi",
        "Coffee and Tea",
        "Executive Meeting Rooms",
        "Ergonomic Chairs",
        "Printing Facilities",
        "Full Kitchen",
        "Rooftop Terrace",
        "24/7 Access",
        "On-site Staff"
      ],
      is_active: true,
      images: [
        "https://example.com/branches/midtown-1.jpg",
        "https://example.com/branches/midtown-2.jpg",
        "https://example.com/branches/midtown-3.jpg"
      ],
      description: "A premium workspace located in the bustling heart of Midtown, offering state-of-the-art facilities with easy access to public transport.",
      created_at: "2022-05-20T10:15:00.000Z",
      updated_at: "2023-07-10T16:20:00.000Z"
    },
    {
      id: 4,
      name: "Brooklyn Branch",
      short_code: "BKB",
      city: "Brooklyn",
      state: "NY",
      country: "USA",
      address: "321 Atlantic Avenue",
      postal_code: "11217",
      latitude: 40.6855,
      longitude: -73.9785,
      phone_number: "+1 (718) 555-3456",
      email: "brooklyn@coworks.com",
      opening_hours: {
        monday: "8:00 AM - 8:00 PM",
        tuesday: "8:00 AM - 8:00 PM",
        wednesday: "8:00 AM - 8:00 PM",
        thursday: "8:00 AM - 8:00 PM",
        friday: "8:00 AM - 8:00 PM",
        saturday: "9:00 AM - 6:00 PM",
        sunday: "10:00 AM - 4:00 PM"
      },
      amenities: [
        "High-speed WiFi",
        "Artisanal Coffee",
        "Meeting Spaces",
        "Standing Desks",
        "Printing Services",
        "Community Kitchen",
        "Event Space",
        "Bike Storage",
        "Shower Facilities"
      ],
      is_active: true,
      images: [
        "https://example.com/branches/brooklyn-1.jpg",
        "https://example.com/branches/brooklyn-2.jpg",
        "https://example.com/branches/brooklyn-3.jpg"
      ],
      description: "A vibrant coworking space in the heart of Brooklyn, housed in a converted industrial building with a creative community vibe.",
      created_at: "2022-07-05T11:45:00.000Z",
      updated_at: "2023-08-18T13:10:00.000Z"
    }
  ];
  
  return branches;
};

/**
 * GET /api/branches - Get all branches with pagination and filtering
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    
    // Validate pagination parameters
    const validPage = page > 0 ? page : 1;
    const validLimit = limit > 0 && limit <= 100 ? limit : 10;
    const offset = (validPage - 1) * validLimit;

    // Build search condition
    let whereClause = {};
    if (search) {
      whereClause = {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { address: { [Op.like]: `%${search}%` } },
          { city: { [Op.like]: `%${search}%` } }
        ]
      };
    }

    // Count total branches matching criteria
    const count = await models.Branch.count({ where: whereClause });

    // Get branches with pagination
    const branches = await models.Branch.findAll({
      where: whereClause,
      limit: validLimit,
      offset,
      order: [['id', 'ASC']]
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Branches retrieved successfully',
        data: {
          branches,
          pagination: {
            total: count,
            page: validPage,
            limit: validLimit,
            pages: Math.ceil(count / validLimit)
          }
        }
      },
      { status: 200, headers: corsHeaders }
    );
    
  } catch (error) {
    console.error('[Branches API] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve branches' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/branches - Create a new branch (admin only)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('[Branches API] POST request received');
    
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
      { success: false, message: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Check if user is admin
    if (!decoded.is_admin) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403, headers: corsHeaders }
      );
    }
    
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.address) {
      return NextResponse.json(
        { success: false, message: 'Branch name and address are required' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    try {
      // Check database connection
      await models.sequelize.authenticate();
      
      // Check if branch with same name already exists
      const existingBranch = await models.Branch.findOne({
        where: { name: body.name }
      });
      
      if (existingBranch) {
        return NextResponse.json(
          { success: false, message: 'Branch with this name already exists' },
          { status: 409, headers: corsHeaders }
        );
      }
      
      // Create new branch
      const branch = await models.Branch.create({
        name: body.name,
        address: body.address,
        contact: body.contact || null,
        email: body.email || null,
        is_active: body.is_active !== undefined ? body.is_active : true,
        opening_time: body.opening_time || '09:00:00',
        closing_time: body.closing_time || '18:00:00'
      });
      
      return NextResponse.json(
        { 
      success: true,
      message: 'Branch created successfully',
          data: { branch }
        },
        { status: 201, headers: corsHeaders }
      );
      
    } catch (dbError) {
      console.error('[Branches API] Database error creating branch:', dbError);
      return NextResponse.json(
        { success: false, message: 'Failed to create branch', error: (dbError as Error).message },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('[Branches API] Error in POST branches:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create branch', error: (error as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}

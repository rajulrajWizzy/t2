// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

// Explicitly set Node.js runtime for this route

// Explicitly set Node.js runtime for this route

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/utils/jwt-wrapper';
import { verifyAuth } from '@/utils/jwt';
import models from '@/models';
import { ApiResponse } from '@/types/api';
import { TicketStatus, TicketCategory } from '@/models/supportTicket';
import { Op } from 'sequelize';

/**
 * GET /api/support/tickets - Get all support tickets for the logged-in customer
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify customer authentication
    const authResult = await verifyAuth(request);
    if ('status' in authResult) {
      return authResult as NextResponse;
    }
    
    const customerId = authResult.id;
    
    // Extract query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const status = url.searchParams.get('status');
    const priority = url.searchParams.get('priority');
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    // Build filter conditions
    const whereConditions: any = {
      customer_id: customerId
    };
    
    // Add filters if provided
    if (status) {
      whereConditions.status = status;
    }
    
    if (priority) {
      whereConditions.priority = priority;
    }
    
    if (category) {
      whereConditions.category = category;
    }
    
    // Add search functionality for ticket number or title
    if (search) {
      whereConditions[Op.or] = [
        { ticket_number: { [Op.iLike]: `%${search}%` } },
        { title: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // Fetch tickets with count
    const { count, rows: tickets } = await models.SupportTicket.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: models.Branch,
          as: 'Branch',
          attributes: ['id', 'name', 'short_code', 'location']
        },
        {
          model: models.SeatingType,
          as: 'SeatingType',
          attributes: ['id', 'name', 'short_code']
        },
        {
          model: models.Admin,
          as: 'AssignedAdmin',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['updated_at', 'DESC']],
      limit,
      offset
    });
    
    // Count unread messages for each ticket
    const ticketsWithUnreadCounts = await Promise.all(
      tickets.map(async (ticket) => {
        const unreadCount = await models.TicketMessage.count({
          where: {
            ticket_id: ticket.id,
            sender_type: 'admin', // Only count messages from admin
            read_at: null // Only count unread messages
          }
        });
        
        const lastMessage = await models.TicketMessage.findOne({
          where: { ticket_id: ticket.id },
          order: [['created_at', 'DESC']]
        });
        
        return {
          ...ticket.toJSON(),
          unread_messages: unreadCount,
          last_message: lastMessage
        };
      })
    );
    
    // Prepare pagination info
    const pagination = {
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit)
    };
    
    // Return success response
    return NextResponse.json<ApiResponse<any>>({
        success: true, 
        message: 'Support tickets retrieved successfully',
        data: {
        tickets: ticketsWithUnreadCounts,
        pagination,
        filters: {
          available_statuses: Object.values(TicketStatus),
          available_priorities: ['low', 'medium', 'high', 'urgent'],
          available_categories: Object.values(TicketCategory)
        }
      }
    }, { status: 200, headers: corsHeaders });
    
  } catch (error) {
    console.error('Error in support tickets route:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to retrieve support tickets',
      errors: error instanceof Error ? [{ message: error.message }] : [{ message: 'Unknown error' }],
      data: null
    }, { status: 500, headers: corsHeaders });
  }
}

/**
 * POST /api/support/tickets - Create a new support ticket
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify customer authentication
    const authResult = await verifyAuth(request);
    if ('status' in authResult) {
      return authResult as NextResponse;
    }
    
    const customerId = authResult.id;

    // Parse request body
    const body = await request.json();
    const { 
      title, 
      description, 
      category = 'other',
      priority = 'medium',
      branch_id, 
      seating_type_id = null,
      booking_id = null,
      booking_type = null
    } = body;
    
    // Validate required fields
    if (!title || !description || !branch_id) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Missing required fields: title, description, and branch_id are required',
        data: null
      }, { status: 400, headers: corsHeaders });
    }
    
    // Verify branch exists
    const branch = await models.Branch.findByPk(branch_id);
    if (!branch) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Branch not found',
        data: null
      }, { status: 404, headers: corsHeaders });
    }
    
    // Verify seating type if provided
    let seatingType = null;
    let seatingTypeCode = null;
    
    if (seating_type_id) {
      seatingType = await models.SeatingType.findByPk(seating_type_id);
      if (!seatingType) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Seating type not found',
          data: null
        }, { status: 404, headers: corsHeaders });
      }
      seatingTypeCode = seatingType.short_code;
    }
    
    // Create ticket in the database
    const newTicket = await models.SupportTicket.create({
      customer_id: customerId,
      branch_id,
      branch_code: branch.short_code,
      seating_type_id,
      seating_type_code: seatingTypeCode,
      booking_id,
      booking_type,
      title,
      category,
      description,
      priority,
      status: TicketStatus.NEW,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    // Create initial message from the customer
    await models.TicketMessage.create({
      ticket_id: newTicket.id,
      message: description,
      sender_type: 'customer',
      sender_id: customerId,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    // Fetch the created ticket with relationships
    const ticket = await models.SupportTicket.findByPk(newTicket.id, {
      include: [
        {
          model: models.Branch,
          as: 'Branch',
          attributes: ['id', 'name', 'short_code', 'location']
        },
        {
          model: models.SeatingType,
          as: 'SeatingType',
          attributes: ['id', 'name', 'short_code']
        }
      ]
    });
    
    return NextResponse.json<ApiResponse<typeof ticket>>({
        success: true, 
        message: 'Support ticket created successfully',
        data: ticket
    }, { status: 201, headers: corsHeaders });
    
  } catch (error) {
    console.error('Error creating support ticket:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to create support ticket',
      errors: error instanceof Error ? [{ message: error.message }] : [{ message: 'Unknown error' }],
      data: null
    }, { status: 500, headers: corsHeaders });
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  });
} 

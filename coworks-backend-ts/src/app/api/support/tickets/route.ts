// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

// Explicitly set Node.js runtime for this route

// Explicitly set Node.js runtime for this route

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/utils/jwt';
import models from '@/models';
import { ApiResponse } from '@/types/api';
import { Op } from 'sequelize';
import { MessageSender } from '@/models/ticketMessage';
import { TicketCategory, TicketStatus } from '@/models/supportTicket';

/**
 * GET /api/support/tickets - Get all tickets for authenticated customer
 */
export async function GET(request: NextRequest) {
  try {
    // Verify customer authentication
    const authResult = await verifyAuth(request);
    if ('status' in authResult) {
      return authResult as NextResponse;
    }
    
    const customerId = authResult.id;
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const fromDate = searchParams.get('from_date');
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    // Build where clause
    const whereClause: any = {
      customer_id: customerId
    };
    
    // Add status filter if provided
    if (status) {
      whereClause.status = status;
    }
    
    // Add date filter if provided
    if (fromDate) {
      whereClause.created_at = {
        [Op.gte]: new Date(fromDate)
      };
    }
    
    // Get tickets with pagination
    const { count, rows: tickets } = await models.SupportTicket.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        {
          association: 'Branch',
          attributes: ['id', 'name', 'location', 'short_code']
        },
        {
          association: 'SeatingType',
          attributes: ['id', 'name', 'short_code']
        },
        {
          association: 'AssignedAdmin',
          attributes: ['id', 'name', 'username']
        }
      ]
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(count / limit);
    
    return NextResponse.json<ApiResponse<typeof tickets>>({
      success: true,
      message: 'Support tickets retrieved successfully',
      data: tickets,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        per_page: limit,
        total_items: count
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('Support tickets fetch error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to retrieve support tickets',
      data: null
    }, { status: 500 });
  }
}

/**
 * POST /api/support/tickets - Create a new support ticket
 */
export async function POST(request: NextRequest) {
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
      category, 
      description, 
      branch_id, 
      branch_code,
      seating_type_id,
      seating_type_code,
      booking_id,
      booking_type 
    } = body;
    
    // Validate required fields
    if (!title || !category || !description || !branch_id || !branch_code) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Title, category, description, branch ID and branch code are required',
        data: null
      }, { status: 400 });
    }
    
    // Validate category
    if (!Object.values(TicketCategory).includes(category as TicketCategory)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Invalid category',
        data: null,
        errors: [
          {
            field: 'category',
            message: `Category must be one of: ${Object.values(TicketCategory).join(', ')}`
          }
        ]
      }, { status: 400 });
    }
    
    // Check if branch exists
    const branch = await models.Branch.findOne({
      where: {
        id: branch_id,
        short_code: branch_code
      }
    });
    
    if (!branch) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Branch not found',
        data: null
      }, { status: 404 });
    }
    
    // Check if seating type exists if provided
    if (seating_type_id && seating_type_code) {
      const seatingType = await models.SeatingType.findOne({
        where: {
          id: seating_type_id,
          short_code: seating_type_code
        }
      });
      
      if (!seatingType) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Seating type not found',
          data: null
        }, { status: 404 });
      }
    }
    
    // Find branch admin to auto-assign
    const branchAdmin = await models.Admin.findOne({
      where: {
        branch_id,
        role: 'branch_admin',
        is_active: true
      }
    });
    
    // Create support ticket
    const ticket = await models.SupportTicket.create({
      customer_id: customerId,
      branch_id,
      branch_code,
      seating_type_id: seating_type_id || null,
      seating_type_code: seating_type_code || null,
      booking_id: booking_id || null,
      booking_type: booking_type || null,
      title,
      category,
      description,
      status: TicketStatus.ASSIGNED,
      assigned_to: branchAdmin ? branchAdmin.id : null
    });
    
    // Add first message to ticket based on description
    await models.TicketMessage.create({
      ticket_id: ticket.id,
      message: description,
      sender_type: MessageSender.CUSTOMER,
      sender_id: customerId
    });
    
    // Fetch created ticket with relations
    const createdTicket = await models.SupportTicket.findByPk(ticket.id, {
      include: [
        {
          association: 'Branch',
          attributes: ['id', 'name', 'location', 'short_code']
        },
        {
          association: 'SeatingType',
          attributes: ['id', 'name', 'short_code']
        },
        {
          association: 'AssignedAdmin',
          attributes: ['id', 'name', 'username']
        }
      ]
    });
    
    return NextResponse.json<ApiResponse<typeof createdTicket>>({
      success: true,
      message: 'Support ticket created successfully',
      data: createdTicket
    }, { status: 201 });
    
  } catch (error) {
    console.error('Support ticket creation error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to create support ticket',
      data: null
    }, { status: 500 });
  }
} 

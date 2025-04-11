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
import { TicketStatus } from '@/models/supportTicket';
import { corsHeaders } from '@/utils/jwt-wrapper';

// Interface for ticket with messages
interface TicketWithMessages {
  id: number;
  ticket_number: string;
  customer_id: number;
  branch_id: number;
  branch_code: string;
  seating_type_id?: number | null;
  seating_type_code?: string | null;
  booking_id?: number | null;
  booking_type?: string | null;
  title: string;
  category: string;
  description: string;
  status: string;
  priority?: string;  // Make priority optional to match the database model
  created_at: Date;
  updated_at: Date;
  closed_at?: Date | null;
  reopened_at?: Date | null;
  assigned_to?: number | null;
  Messages?: any[];
  Branch?: any;
  SeatingType?: any;
  AssignedAdmin?: any;
}

/**
 * GET /api/support/tickets/[ticket_id] - Get ticket details with messages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify customer authentication
    const authResult = await verifyAuth(request);
    if ('status' in authResult) {
      return authResult as NextResponse;
    }
    
    const customerId = authResult.id;
    const ticketId = parseInt(params.id);
    
    if (isNaN(ticketId)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Invalid ticket ID',
        data: null
      }, { status: 400, headers: corsHeaders });
    }
    
    // Fetch ticket with relationships
    const ticket = await models.SupportTicket.findOne({
      where: {
        id: ticketId,
        customer_id: customerId
      },
      include: [
        {
          model: models.Branch,
          as: 'Branch',
          attributes: ['id', 'name', 'location', 'short_code']
        },
        {
          model: models.SeatingType,
          as: 'SeatingType',
          attributes: ['id', 'name', 'short_code']
        },
        {
          model: models.Admin,
          as: 'AssignedAdmin',
          attributes: ['id', 'name', 'username', 'email']
        },
        {
          model: models.TicketMessage,
          as: 'Messages',
          include: [
            {
              model: models.SupportTicket,
              as: 'Ticket'
            }
          ],
          order: [['created_at', 'ASC']]
        }
      ]
    }) as TicketWithMessages;
    
    if (!ticket) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Ticket not found',
        data: null
      }, { status: 404, headers: corsHeaders });
    }
    
    // Mark unread messages from admin as read
    if (ticket.Messages && ticket.Messages.length > 0) {
      const messagesToUpdate = ticket.Messages.filter(
        (message) => message.sender_type === 'admin' && !message.read_at
      );
      
      if (messagesToUpdate.length > 0) {
        await Promise.all(
          messagesToUpdate.map((message) => 
            models.TicketMessage.update(
              { read_at: new Date() },
              { where: { id: message.id } }
            )
          )
        );
      }
    }
    
    return NextResponse.json<ApiResponse<TicketWithMessages>>({
      success: true,
      message: 'Ticket retrieved successfully',
      data: ticket
    }, { status: 200, headers: corsHeaders });
    
  } catch (error) {
    console.error('Ticket fetch error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to retrieve ticket',
      errors: error instanceof Error ? [{ message: error.message }] : [{ message: 'Unknown error' }],
      data: null
    }, { status: 500, headers: corsHeaders });
  }
}

/**
 * PUT /api/support/tickets/[ticket_id] - Update ticket (reopen closed tickets)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify customer authentication
    const authResult = await verifyAuth(request);
    if ('status' in authResult) {
      return authResult as NextResponse;
    }
    
    const customerId = authResult.id;
    const ticketId = parseInt(params.id);
    
    if (isNaN(ticketId)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Invalid ticket ID',
        data: null
      }, { status: 400, headers: corsHeaders });
    }
    
    // Fetch ticket
    const ticket = await models.SupportTicket.findOne({
      where: {
        id: ticketId,
        customer_id: customerId
      }
    });
    
    if (!ticket) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Ticket not found',
        data: null
      }, { status: 404, headers: corsHeaders });
    }
    
    // Parse request body
    const body = await request.json();
    const { action, message } = body;
    
    // Customer can only reopen closed tickets
    if (action === 'reopen') {
      if (ticket.status !== TicketStatus.CLOSED) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Only closed tickets can be reopened',
          data: null
        }, { status: 400, headers: corsHeaders });
      }
      
      if (!message) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Message is required to reopen a ticket',
          data: null
        }, { status: 400, headers: corsHeaders });
      }
      
      // Update ticket status to reopened
      await ticket.update({
        status: TicketStatus.REOPENED,
        reopened_at: new Date(),
        closed_at: null,
        updated_at: new Date()
      });
      
      // Add reopening message
      await models.TicketMessage.create({
        ticket_id: ticketId,
        message,
        sender_type: 'customer',
        sender_id: customerId,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      // Fetch updated ticket with relationships
      const updatedTicket = await models.SupportTicket.findByPk(ticketId, {
        include: [
          {
            model: models.Branch,
            as: 'Branch',
            attributes: ['id', 'name', 'location', 'short_code']
          },
          {
            model: models.SeatingType,
            as: 'SeatingType',
            attributes: ['id', 'name', 'short_code']
          },
          {
            model: models.Admin,
            as: 'AssignedAdmin',
            attributes: ['id', 'name', 'username', 'email']
          }
        ]
      });
      
      return NextResponse.json<ApiResponse<typeof updatedTicket>>({
        success: true,
        message: 'Ticket reopened successfully',
        data: updatedTicket
      }, { status: 200, headers: corsHeaders });
    } else {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Invalid action. Customers can only reopen tickets',
        data: null
      }, { status: 400, headers: corsHeaders });
    }
    
  } catch (error) {
    console.error('Ticket update error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to update ticket',
      errors: error instanceof Error ? [{ message: error.message }] : [{ message: 'Unknown error' }],
      data: null
    }, { status: 500, headers: corsHeaders });
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  });
} 
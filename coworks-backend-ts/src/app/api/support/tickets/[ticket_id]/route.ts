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
import SupportTicketModel from '@/models/supportTicket';
import TicketMessageModel from '@/models/ticketMessage';

// Extend SupportTicketModel interface for TypeScript
interface TicketWithMessages extends SupportTicketModel {
  Messages?: TicketMessageModel[];
  Branch?: any;
  SeatingType?: any;
  AssignedAdmin?: any;
}

/**
 * GET /api/support/tickets/[ticket_id] - Get ticket details with messages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { ticket_id: string } }
) {
  try {
    // Verify customer authentication
    const authResult = await verifyAuth(request);
    if ('status' in authResult) {
      return authResult as NextResponse;
    }
    
    const customerId = authResult.id;
    const ticketId = parseInt(params.ticket_id);
    
    if (isNaN(ticketId)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Invalid ticket ID',
        data: null
      }, { status: 400 });
    }
    
    // Fetch ticket with relationships
    const ticket = await models.SupportTicket.findOne({
      where: {
        id: ticketId,
        customer_id: customerId
      },
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
        },
        {
          association: 'Messages',
          include: [
            {
              association: 'Ticket'
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
      }, { status: 404 });
    }
    
    // Mark unread messages from admin as read
    if (ticket.Messages && ticket.Messages.length > 0) {
      const messagesToUpdate = ticket.Messages.filter(
        (message: TicketMessageModel) => message.sender_type === 'admin' && !message.read_at
      );
      
      if (messagesToUpdate.length > 0) {
        await Promise.all(
          messagesToUpdate.map((message: TicketMessageModel) => 
            models.TicketMessage.update(
              { read_at: new Date() },
              { where: { id: message.id } }
            )
          )
        );
      }
    }
    
    return NextResponse.json<ApiResponse<typeof ticket>>({
      success: true,
      message: 'Ticket retrieved successfully',
      data: ticket
    }, { status: 200 });
    
  } catch (error) {
    console.error('Ticket fetch error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to retrieve ticket',
      data: null
    }, { status: 500 });
  }
}

/**
 * PUT /api/support/tickets/[ticket_id] - Update ticket (reopen closed tickets)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { ticket_id: string } }
) {
  try {
    // Verify customer authentication
    const authResult = await verifyAuth(request);
    if ('status' in authResult) {
      return authResult as NextResponse;
    }
    
    const customerId = authResult.id;
    const ticketId = parseInt(params.ticket_id);
    
    if (isNaN(ticketId)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Invalid ticket ID',
        data: null
      }, { status: 400 });
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
      }, { status: 404 });
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
        }, { status: 400 });
      }
      
      if (!message) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Message is required to reopen a ticket',
          data: null
        }, { status: 400 });
      }
      
      // Update ticket status to reopened
      await ticket.update({
        status: TicketStatus.REOPENED,
        reopened_at: new Date(),
        closed_at: null
      });
      
      // Add reopening message
      await models.TicketMessage.create({
        ticket_id: ticketId,
        message,
        sender_type: 'customer',
        sender_id: customerId
      });
      
      // Fetch updated ticket with relationships
      const updatedTicket = await models.SupportTicket.findByPk(ticketId, {
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
      
      return NextResponse.json<ApiResponse<typeof updatedTicket>>({
        success: true,
        message: 'Ticket reopened successfully',
        data: updatedTicket
      }, { status: 200 });
    } else {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Invalid action. Customers can only reopen tickets',
        data: null
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Ticket update error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to update ticket',
      data: null
    }, { status: 500 });
  }
} 
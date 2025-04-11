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
import { MessageSender } from '@/models/ticketMessage';

/**
 * POST /api/support/tickets/messages - Add new message to ticket
 */
export async function POST(request: NextRequest) {
  try {
    // Verify customer authentication
    const authResult = await verifyAuth(request);
    if ('status' in authResult) {
      return authResult as NextResponse;
    }
    
    const customerId = authResult.id;
    const body = await request.json();
    const { ticket_id, message } = body;
    
    // Validate required fields
    if (!ticket_id || !message) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Ticket ID and message are required',
        data: null
      }, { status: 400, headers: corsHeaders });
    }
    
    // Check if ticket exists and belongs to the customer
    const ticket = await models.SupportTicket.findOne({
      where: {
        id: ticket_id,
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
    
    // Cannot add messages to closed tickets
    if (ticket.status === TicketStatus.CLOSED) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Cannot add messages to closed tickets. Please reopen the ticket first.',
        data: null
      }, { status: 400, headers: corsHeaders });
    }
    
    // Create new message
    const newMessage = await models.TicketMessage.create({
      ticket_id,
      message,
      sender_type: MessageSender.CUSTOMER,
      sender_id: customerId,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    // If ticket is in 'new' status, update to 'in_progress'
    if (ticket.status === TicketStatus.NEW) {
      await ticket.update({
        status: TicketStatus.IN_PROGRESS,
        updated_at: new Date()
      });
    }
    
    // Fetch complete message with related data
    const completeMessage = await models.TicketMessage.findByPk(newMessage.id, {
      include: [
        {
          model: models.SupportTicket,
          as: 'Ticket',
          attributes: ['id', 'ticket_number', 'title', 'status']
        }
      ]
    });
    
    return NextResponse.json<ApiResponse<typeof completeMessage>>({
      success: true,
      message: 'Message added successfully',
      data: completeMessage
    }, { status: 201, headers: corsHeaders });
    
  } catch (error) {
    console.error('Add message error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to add message',
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

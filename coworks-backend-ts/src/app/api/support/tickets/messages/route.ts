import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/utils/jwt';
import models from '@/models';
import { ApiResponse } from '@/types/api';
import { TicketStatus } from '@/models/supportTicket';

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
      }, { status: 400 });
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
      }, { status: 404 });
    }
    
    // Cannot add messages to closed tickets
    if (ticket.status === TicketStatus.CLOSED) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Cannot add messages to closed tickets. Please reopen the ticket first.',
        data: null
      }, { status: 400 });
    }
    
    // Create new message
    const newMessage = await models.TicketMessage.create({
      ticket_id,
      message,
      sender_type: 'customer',
      sender_id: customerId
    });
    
    // If ticket is in 'new' status, update to 'in_progress'
    if (ticket.status === TicketStatus.NEW) {
      await ticket.update({
        status: TicketStatus.IN_PROGRESS
      });
    }
    
    return NextResponse.json<ApiResponse<typeof newMessage>>({
      success: true,
      message: 'Message added successfully',
      data: newMessage
    }, { status: 201 });
    
  } catch (error) {
    console.error('Add message error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to add message',
      data: null
    }, { status: 500 });
  }
} 
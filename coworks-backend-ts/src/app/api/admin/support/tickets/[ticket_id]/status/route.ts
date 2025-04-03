// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/adminAuth';
import models from '@/models';
import { ApiResponse } from '@/types/api';
import { TicketStatus } from '@/models/supportTicket';
import { MessageSender } from '@/models/ticketMessage';

/**
 * PUT /api/admin/support/tickets/[ticket_id]/status - Update ticket status and notify user
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { ticket_id: string } }
) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdmin(request);
    if ('status' in authResult) {
      return authResult as NextResponse;
    }

    const adminId = authResult.id;
    const ticketId = parseInt(params.ticket_id);

    if (isNaN(ticketId)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: 'Invalid ticket ID',
          data: null
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { status, message } = body;

    if (!status || !Object.values(TicketStatus).includes(status)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: 'Invalid ticket status',
          data: null
        },
        { status: 400 }
      );
    }

    // Get ticket with customer info for notifications
    const ticket = await models.SupportTicket.findOne({
      where: { id: ticketId },
      include: [
        {
          model: models.Customer,
          as: 'Customer',
          attributes: ['id', 'email', 'notification_preferences']
        }
      ]
    });

    if (!ticket) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          message: 'Ticket not found',
          data: null
        },
        { status: 404 }
      );
    }

    // Update ticket status
    await ticket.update({ status });

    // Create status update message
    const statusMessage = `Ticket status updated to: ${status}`;
    await models.TicketMessage.create({
      ticket_id: ticketId,
      message: message || statusMessage,
      sender_type: MessageSender.ADMIN,
      sender_id: adminId
    });

    // Check customer notification preferences
    const customer = ticket.get('Customer');
    if (customer?.notification_preferences?.ticket_updates) {
      // Here you would implement your notification service
      // For example:
      // await notificationService.sendEmail({
      //   to: customer.email,
      //   subject: `Support Ticket #${ticketId} Status Update`,
      //   message: `Your ticket status has been updated to ${status}. ${message || ''}`
      // });
    }

    // Fetch updated ticket with messages
    const updatedTicket = await models.SupportTicket.findByPk(ticketId, {
      include: [
        {
          model: models.TicketMessage,
          as: 'Messages',
          order: [['created_at', 'ASC']]
        }
      ]
    });

    return NextResponse.json<ApiResponse<typeof updatedTicket>>(
      {
        success: true,
        message: 'Ticket status updated successfully',
        data: updatedTicket
      }
    );

  } catch (error) {
    console.error('Error updating ticket status:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        message: 'Failed to update ticket status',
        data: null
      },
      { status: 500 }
    );
  }
}
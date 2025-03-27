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
import { Op } from 'sequelize';

/**
 * POST /api/admin/support/tickets/[ticket_id]/messages - Add admin message to ticket
 */
export async function POST(
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
    const adminRole = authResult.role;
    const ticketId = parseInt(params.ticket_id);
    
    if (isNaN(ticketId)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Invalid ticket ID',
        data: null
      }, { status: 400 });
    }
    
    // Parse request body
    const body = await request.json();
    const { message } = body;
    
    // Validate message
    if (!message) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Message is required',
        data: null
      }, { status: 400 });
    }
    
    // Build query to get ticket
    const query: any = {
      where: { id: ticketId }
    };
    
    // Regular admins can only access tickets from their branches
    if (adminRole !== 'super_admin') {
      const adminBranches = await models.AdminBranch.findAll({
        where: { admin_id: adminId },
        attributes: ['branch_id']
      });
      
      const branchIds = adminBranches.map((branch: any) => branch.branch_id);
      
      if (branchIds.length === 0) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'You do not have access to any branches',
          data: null
        }, { status: 403 });
      }
      
      query.where.branch_id = { [Op.in]: branchIds };
    }
    
    // Fetch ticket
    const ticket = await models.SupportTicket.findOne(query);
    
    if (!ticket) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Ticket not found or you do not have access to this ticket',
        data: null
      }, { status: 404 });
    }
    
    // Cannot add messages to closed tickets
    if (ticket.status === TicketStatus.CLOSED) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Cannot add messages to closed tickets',
        data: null
      }, { status: 400 });
    }
    
    // Create new message
    const newMessage = await models.TicketMessage.create({
      ticket_id: ticketId,
      message,
      sender_type: MessageSender.ADMIN,
      sender_id: adminId
    });
    
    // Update ticket if needed
    const updateData: any = {};
    
    // If ticket is unassigned, assign it to the admin
    if (!ticket.assigned_to) {
      updateData.assigned_to = adminId;
    }
    
    // If ticket is in NEW status, update to IN_PROGRESS
    if (ticket.status === TicketStatus.NEW) {
      updateData.status = TicketStatus.IN_PROGRESS;
    }
    
    // Update ticket if needed
    if (Object.keys(updateData).length > 0) {
      await ticket.update(updateData);
    }
    
    return NextResponse.json<ApiResponse<typeof newMessage>>({
      success: true,
      message: 'Message added successfully',
      data: newMessage
    }, { status: 201 });
    
  } catch (error) {
    console.error('Admin add message error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to add message',
      data: null
    }, { status: 500 });
  }
} 
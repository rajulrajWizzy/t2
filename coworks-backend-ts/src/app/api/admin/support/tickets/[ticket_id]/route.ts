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
 * GET /api/admin/support/tickets/[ticket_id] - Get ticket details for admin
 */
export async function GET(
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
    
    // Build query to get ticket
    const query: any = {
      where: { id: ticketId },
      include: [
        {
          association: 'Customer',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          association: 'Branch',
          attributes: ['id', 'name', 'short_code', 'location']
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
          order: [['created_at', 'ASC']]
        }
      ]
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
    const ticket = await models.SupportTicket.findOne({
      ...query,
      include: [
        {
          model: models.TicketMessage,
          as: 'Messages'
        }
      ]
    });
    
    if (!ticket) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Ticket not found',
        data: null
      }, { status: 404 });
    }
    
    // Mark unread messages from customer as read
    const ticketWithMessages = ticket as any;
    if (ticketWithMessages.Messages && ticketWithMessages.Messages.length > 0) {
      const messagesToUpdate = ticketWithMessages.Messages.filter(
        (message: any) => message.sender_type === 'customer' && !message.read_at
      );
      
      if (messagesToUpdate.length > 0) {
        await Promise.all(
          messagesToUpdate.map((message: any) => 
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
    });
    
  } catch (error) {
    console.error('Admin ticket fetch error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to retrieve ticket',
      data: null
    }, { status: 500 });
  }
}

/**
 * PUT /api/admin/support/tickets/[ticket_id] - Update ticket status or assignment
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
    const { status, assigned_to, message } = body;
    
    // At least one update field is required
    if (!status && !assigned_to && !message) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'At least one of status, assigned_to, or message is required',
        data: null
      }, { status: 400 });
    }
    
    // Validate status if provided
    if (status && !Object.values(TicketStatus).includes(status)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Invalid ticket status',
        data: null
      }, { status: 400 });
    }
    
    // Build query to get ticket
    const query: any = {
      where: { id: ticketId },
      include: [
        { association: 'Branch' }
      ]
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
    
    // Prepare update object
    const updateData: any = {};
    
    // Handle status change
    if (status) {
      updateData.status = status;
      
      // Set additional fields based on status
      if (status === TicketStatus.CLOSED) {
        updateData.closed_at = new Date();
      } else if (status === TicketStatus.IN_PROGRESS && !ticket.assigned_to) {
        updateData.assigned_to = adminId;
      } else if (status === TicketStatus.REOPENED) {
        updateData.reopened_at = new Date();
        updateData.closed_at = null;
      }
    }
    
    // Handle assignment change
    if (assigned_to) {
      // Verify admin exists
      const assignedAdmin = await models.Admin.findByPk(assigned_to);
      if (!assignedAdmin) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Assigned admin not found',
          data: null
        }, { status: 400 });
      }
      
      // If not super admin, verify assigned admin has access to this branch
      if (adminRole !== 'super_admin') {
        const adminAccess = await models.AdminBranch.findOne({
          where: {
            admin_id: assigned_to,
            branch_id: ticket.branch_id
          }
        });
        
        if (!adminAccess) {
          return NextResponse.json<ApiResponse<null>>({
            success: false,
            message: 'The assigned admin does not have access to this branch',
            data: null
          }, { status: 400 });
        }
      }
      
      updateData.assigned_to = assigned_to;
    }
    
    // Update ticket
    await ticket.update(updateData);
    
    // Add message if provided
    if (message) {
      await models.TicketMessage.create({
        ticket_id: ticketId,
        message,
        sender_type: MessageSender.ADMIN,
        sender_id: adminId
      });
    }
    
    // Fetch updated ticket
    const updatedTicket = await models.SupportTicket.findByPk(ticketId, {
      include: [
        {
          association: 'Customer',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          association: 'Branch',
          attributes: ['id', 'name', 'short_code', 'location']
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
      message: 'Ticket updated successfully',
      data: updatedTicket
    });
    
  } catch (error) {
    console.error('Admin ticket update error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to update ticket',
      data: null
    }, { status: 500 });
  }
} 
// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";


import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/adminAuth';
import models from '@/models';
import { ApiResponse } from '@/types/api';
import { Op } from 'sequelize';
import { TicketStatus } from '@/models/supportTicket';

/**
 * GET /api/admin/support/tickets - Get all tickets for admin
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdmin(request);
    if ('status' in authResult) {
      return authResult as NextResponse;
    }
    
    const adminId = authResult.id;
    const adminRole = authResult.role;
    const url = new URL(request.url);
    
    // Parse pagination params
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    const offset = (page - 1) * pageSize;
    
    // Parse filter params
    const status = url.searchParams.get('status');
    const branchId = url.searchParams.get('branch_id');
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    
    // Build where clause based on admin role and filters
    const whereClause: any = {};
    
    // Admin users can only see tickets from their branches unless they're super admins
    if (adminRole !== 'super_admin') {
      const adminBranches = await models.AdminBranch.findAll({
        where: { admin_id: adminId },
        attributes: ['branch_id']
      });
      
      const branchIds = adminBranches.map((branch: any) => branch.branch_id);
      
      if (branchIds.length === 0) {
        return NextResponse.json<ApiResponse<any>>({
          success: true,
          message: 'No tickets found',
          data: {
            tickets: [],
            pagination: {
              total: 0,
              page,
              pageSize,
              pages: 0
            }
          }
        });
      }
      
      whereClause.branch_id = { [Op.in]: branchIds };
    }
    
    // Apply additional filters
    if (status) {
      whereClause.status = status;
    }
    
    if (branchId && (adminRole === 'super_admin' || (adminRole !== 'super_admin' && whereClause.branch_id[Op.in].includes(parseInt(branchId))))) {
      whereClause.branch_id = parseInt(branchId);
    }
    
    if (dateFrom) {
      whereClause.created_at = { ...whereClause.created_at, [Op.gte]: new Date(dateFrom) };
    }
    
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      whereClause.created_at = { 
        ...whereClause.created_at, 
        [Op.lte]: endDate 
      };
    }
    
    // Count total tickets matching criteria
    const totalTickets = await models.SupportTicket.count({ where: whereClause });
    const totalPages = Math.ceil(totalTickets / pageSize);
    
    // Fetch tickets with pagination
    const tickets = await models.SupportTicket.findAll({
      where: whereClause,
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
          attributes: ['id', 'message', 'sender_type', 'sender_id', 'created_at', 'read_at'],
          order: [['created_at', 'DESC']]
        }
      ],
      order: [
        ['created_at', 'DESC']
      ],
      limit: pageSize,
      offset
    });
    
    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: 'Tickets retrieved successfully',
      data: {
        tickets,
        pagination: {
          total: totalTickets,
          page,
          pageSize,
          pages: totalPages
        }
      }
    });
    
  } catch (error) {
    console.error('Admin ticket fetch error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to retrieve tickets',
      data: null
    }, { status: 500 });
  }
}

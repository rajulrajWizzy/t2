// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

// Explicitly set Node.js runtime for this route

// Explicitly set Node.js runtime for this route

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, corsHeaders } from '@/utils/jwt-wrapper';

interface SupportTicket {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  assigned_to?: number;
  assigned_name?: string;
}

// GET support tickets
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('Support Tickets API GET called');

    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json(
        { success: false, message: 'Authorization token expired or invalid' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    
    // Return mock ticket data
    const mockData = generateMockTickets(page, limit, status, priority);
    return NextResponse.json(
      { 
        success: true, 
        message: 'Support tickets retrieved successfully',
        data: {
          tickets: mockData.tickets,
          pagination: mockData.pagination
        }
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error in support tickets route:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve support tickets' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST create a new support ticket
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('Support Tickets API POST called');

    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json(
        { success: false, message: 'Authorization token expired or invalid' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Create mock ticket
    const ticket = {
      id: Math.floor(Math.random() * 1000) + 1,
      user_id: decoded.id || 1,
      user_name: decoded.name || 'Anonymous User',
      user_email: decoded.email || 'anonymous@example.com',
      subject: body.subject || 'No Subject',
      description: body.description || 'No Description',
      status: 'open',
      priority: body.priority || 'medium',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'Support ticket created successfully',
        data: ticket
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error creating support ticket:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create support ticket' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Helper function to generate mock ticket data
function generateMockTickets(page: number, limit: number, status?: string | null, priority?: string | null) {
  const totalTickets = 38;
  const startIndex = (page - 1) * limit;
  const endIndex = Math.min(startIndex + limit, totalTickets);
  
  const statusOptions = ['open', 'in_progress', 'resolved', 'closed'];
  const priorityOptions = ['low', 'medium', 'high', 'urgent'];
  
  const tickets: SupportTicket[] = [];
  
  for (let i = startIndex; i < endIndex; i++) {
    const id = totalTickets - i;
    const ticketStatus = status ? (status as 'open' | 'in_progress' | 'resolved' | 'closed') : 
      statusOptions[Math.floor(Math.random() * statusOptions.length)] as 'open' | 'in_progress' | 'resolved' | 'closed';
    const ticketPriority = priority ? (priority as 'low' | 'medium' | 'high' | 'urgent') :
      priorityOptions[Math.floor(Math.random() * priorityOptions.length)] as 'low' | 'medium' | 'high' | 'urgent';
    
    tickets.push({
      id,
      user_id: Math.floor(Math.random() * 10) + 1,
      user_name: `User ${Math.floor(Math.random() * 100) + 1}`,
      user_email: `user${Math.floor(Math.random() * 100) + 1}@excelcoworks.com`,
      subject: `Support Ticket #${id}`,
      description: `This is a sample description for support ticket #${id}. It contains details about the issue.`,
      status: ticketStatus,
      priority: ticketPriority,
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
      updated_at: new Date(Date.now() - i * 86400000 + 3600000).toISOString(),
      assigned_to: Math.random() > 0.3 ? Math.floor(Math.random() * 5) + 1 : undefined,
      assigned_name: Math.random() > 0.3 ? `Admin ${Math.floor(Math.random() * 5) + 1}` : undefined
    });
  }
  
  return {
    tickets,
    pagination: {
      total: totalTickets,
      page,
      limit,
      pages: Math.ceil(totalTickets / limit)
    }
  };
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  });
} 

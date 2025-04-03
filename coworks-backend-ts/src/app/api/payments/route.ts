// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, corsHeaders } from '@/utils/jwt-wrapper';

interface Payment {
  id: number;
  user_id: number;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  description: string;
  transaction_id: string;
  created_at: string;
  updated_at: string;
}

// GET payments
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('Payments API GET called');

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
    const userId = searchParams.get('user_id');
    const status = searchParams.get('status');
    
    // Return mock payment data
    const mockData = generateMockPayments(page, limit);
    return NextResponse.json(
      { 
        success: true, 
        message: 'Mock payments retrieved successfully',
        data: {
          payments: mockData.payments,
          pagination: mockData.pagination
        }
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error in payments route:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve payments' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Helper function to generate mock payment data
function generateMockPayments(page: number, limit: number) {
  const totalPayments = 28;
  const startIndex = (page - 1) * limit;
  const endIndex = Math.min(startIndex + limit, totalPayments);
  
  const payments: Payment[] = [];
  
  for (let i = startIndex; i < endIndex; i++) {
    const id = totalPayments - i;
    const amount = Math.floor(Math.random() * 50000) / 100 + 100;
    const status = ['completed', 'pending', 'failed'][Math.floor(Math.random() * 3)];
    const payment_method = ['credit_card', 'paypal', 'bank_transfer'][Math.floor(Math.random() * 3)];
    
    payments.push({
      id,
      user_id: Math.floor(Math.random() * 10) + 1,
      amount,
      currency: 'USD',
      status,
      payment_method,
      description: `Payment for booking #${1000 + id}`,
      transaction_id: `TRX-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
      updated_at: new Date(Date.now() - i * 86400000 + 3600000).toISOString()
    });
  }
  
  return {
    payments,
    pagination: {
      total: totalPayments,
      page,
      limit,
      pages: Math.ceil(totalPayments / limit)
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
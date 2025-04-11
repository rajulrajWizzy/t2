// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyAuth } from '@/utils/jwt';
import { corsHeaders } from '@/utils/jwt-wrapper';

/**
 * GET /api/coins/transactions - Get current user's coin transaction history
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if ('status' in auth) {
      return auth as NextResponse;
    }
    
    // Get user ID from token
    const userId = auth.id;
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Validate pagination parameters
    const validPage = page > 0 ? page : 1;
    const validLimit = limit > 0 && limit <= 100 ? limit : 10;
    const offset = (validPage - 1) * validLimit;
    
    // Get transaction count for pagination
    const transactionCount = await models.CoinTransaction.count({
      where: { customer_id: userId }
    });
    
    // Get transaction history
    const transactions = await models.CoinTransaction.findAll({
      where: { customer_id: userId },
      order: [['created_at', 'DESC']],
      limit: validLimit,
      offset
    });
    
    // Get current balance
    const coinRecord = await models.CustomerCoin.findOne({
      where: { customer_id: userId }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        transactions,
        current_balance: coinRecord ? coinRecord.balance : 0,
        pagination: {
          total: transactionCount,
          page: validPage,
          limit: validLimit,
          pages: Math.ceil(transactionCount / validLimit)
        }
      }
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('[Coins API] Error retrieving transaction history:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve transaction history',
      error: (error as Error).message
    }, { status: 500, headers: corsHeaders });
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
} 
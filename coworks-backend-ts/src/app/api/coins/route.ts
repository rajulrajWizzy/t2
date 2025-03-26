export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyToken } from '@/utils/jwt';
import { ApiResponse } from '@/types/common';
import { verifyProfileComplete } from '../middleware/verifyProfileComplete';
import { CoinTransactionTypeEnum } from '@/types/coins';

/**
 * GET /api/coins - Get user's coin balance and transaction history
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Unauthorized',
        data: null
      }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Unauthorized',
        data: null
      }, { status: 401 });
    }
    
    // Verify profile is complete with required documents
    const profileVerificationResponse = await verifyProfileComplete(request);
    if (profileVerificationResponse) {
      return profileVerificationResponse;
    }
    
    // Get customer
    const customer = await models.Customer.findByPk(decoded.id);
    if (!customer) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Customer not found',
        data: null
      }, { status: 404 });
    }

    // Check if we need to reset coins (monthly reset)
    await customer.resetCoinsIfNeeded();
    
    // Get transaction history (optional limit from query param)
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    const transactions = await models.CustomerCoinTransaction.findAll({
      where: { customer_id: customer.id },
      order: [['created_at', 'DESC']],
      limit: Math.min(limit, 100) // Maximum 100 transactions
    });
    
    // Return balance and transactions
    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: 'Coin balance retrieved successfully',
      data: {
        balance: customer.coins_balance,
        last_reset: customer.coins_last_reset,
        max_coins: 1196,
        transactions: transactions.map(tx => ({
          id: tx.id,
          type: tx.transaction_type,
          amount: tx.amount,
          description: tx.description || '',
          booking_id: tx.booking_id,
          created_at: tx.created_at
        }))
      }
    });
  } catch (error) {
    console.error('Error retrieving coin balance:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to retrieve coin balance',
      error: (error as Error).message,
      data: null
    }, { status: 500 });
  }
} 
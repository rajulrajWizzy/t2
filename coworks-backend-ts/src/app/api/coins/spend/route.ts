// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyAuth } from '@/utils/jwt';
import { corsHeaders } from '@/utils/jwt-wrapper';
import { v4 as uuidv4 } from 'uuid';

interface SpendCoinsRequest {
  amount: number;
  service_type: string;
  description?: string;
  reference_id?: string;
}

/**
 * POST /api/coins/spend - Spend coins on a service
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if ('status' in auth) {
      return auth as NextResponse;
    }
    
    // Get user ID from token
    const userId = auth.id;
    
    // Parse request body
    const body: SpendCoinsRequest = await request.json();
    
    // Validate required fields
    if (!body.amount || !body.service_type) {
      return NextResponse.json({
        success: false,
        message: 'Amount and service_type are required'
      }, { status: 400, headers: corsHeaders });
    }
    
    if (body.amount <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Amount must be greater than zero'
      }, { status: 400, headers: corsHeaders });
    }
    
    // Get user's coin balance
    const coinRecord = await models.CustomerCoin.findOne({
      where: { customer_id: userId }
    });
    
    if (!coinRecord) {
      return NextResponse.json({
        success: false,
        message: 'No coin balance found for this user'
      }, { status: 404, headers: corsHeaders });
    }
    
    // Check if user has enough coins
    if (coinRecord.balance < body.amount) {
      return NextResponse.json({
        success: false,
        message: 'Insufficient coins for this transaction',
        data: {
          required: body.amount,
          available: coinRecord.balance,
          shortfall: body.amount - coinRecord.balance
        }
      }, { status: 400, headers: corsHeaders });
    }
    
    // Generate a reference ID if none provided
    const referenceId = body.reference_id || uuidv4();
    
    // Create description
    const description = body.description || `Spent on ${body.service_type}`;
    
    // Start a transaction to ensure data integrity
    const transaction = await models.sequelize.transaction();
    
    try {
      // Deduct coins from balance
      await coinRecord.update({
        balance: coinRecord.balance - body.amount,
        last_updated: new Date()
      }, { transaction });
      
      // Create transaction record
      await models.CoinTransaction.create({
        customer_id: userId,
        amount: body.amount,
        transaction_type: 'PURCHASE',
        description,
        reference_id: referenceId,
        created_at: new Date()
      }, { transaction });
      
      // Commit the transaction
      await transaction.commit();
      
      return NextResponse.json({
        success: true,
        message: 'Coins spent successfully',
        data: {
          amount: body.amount,
          service_type: body.service_type,
          reference_id: referenceId,
          remaining_balance: coinRecord.balance - body.amount,
          transaction_date: new Date().toISOString()
        }
      }, { headers: corsHeaders });
    } catch (error) {
      // Rollback the transaction if there's an error
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('[Coins API] Error spending coins:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to process coin transaction',
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
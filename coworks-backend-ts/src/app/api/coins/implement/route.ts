// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyAuth } from '@/utils/jwt';
import { corsHeaders } from '@/utils/jwt-wrapper';
import { Op } from 'sequelize';

interface CoinImplementRequest {
  amount?: number;
  description?: string;
}

/**
 * POST /api/coins/implement - Add coins to user account
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
    
    // Get customer information, including seating type
    const customer = await getCustomerWithSeatingType(userId);
    if (!customer) {
      return NextResponse.json({
        success: false,
        message: 'Customer not found'
      }, { status: 404, headers: corsHeaders });
    }
    
    // Check if user is a daily pass holder
    const isDailyPass = checkIfDailyPass(customer);
    
    if (isDailyPass) {
      // Daily pass users need to pay via Razorpay
      return NextResponse.json({
        success: false,
        message: 'Daily pass users need to purchase coins via Razorpay',
        redirect_to_payment: true,
        payment_info: {
          type: 'razorpay',
          url: '/payment/coins',
          amount_required: 1196
        }
      }, { status: 200, headers: corsHeaders });
    }
    
    // Parse request body
    const body: CoinImplementRequest = await request.json();
    
    // Standard users get 1196 coins for free
    const coinAmount = body.amount || 1196;
    const description = body.description || 'Standard coin allocation';
    
    // Get or create customer coin record
    let coinRecord = await models.CustomerCoin.findOne({
      where: { customer_id: userId }
    });
    
    if (!coinRecord) {
      // Create new record
      coinRecord = await models.CustomerCoin.create({
        customer_id: userId,
        balance: coinAmount,
        is_daily_pass: false,
        last_updated: new Date()
      });
    } else {
      // Update existing record
      await coinRecord.update({
        balance: coinRecord.balance + coinAmount,
        last_updated: new Date()
      });
    }
    
    // Create transaction log
    await models.CoinTransaction.create({
      customer_id: userId,
      amount: coinAmount,
      transaction_type: 'CREDIT',
      description: description,
      created_at: new Date()
    });
    
    return NextResponse.json({
      success: true,
      message: 'Coins implemented successfully',
      data: {
        balance: coinRecord.balance,
        amount_added: coinAmount,
        customer_id: userId
      }
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('[Coins API] Error implementing coins:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to implement coins',
      error: (error as Error).message
    }, { status: 500, headers: corsHeaders });
  }
}

/**
 * Get customer info with their seating type
 */
async function getCustomerWithSeatingType(userId: number) {
  try {
    return await models.Customer.findByPk(userId, {
      include: [{
        model: models.SeatBooking,
        as: 'SeatBookings',
        required: false,
        limit: 1,
        order: [['created_at', 'DESC']],
        where: {
          status: {
            [Op.in]: ['confirmed', 'active']
          }
        },
        include: [{
          model: models.Seat,
          as: 'Seat',
          include: [{
            model: models.SeatingType,
            as: 'SeatingType'
          }]
        }]
      }]
    });
  } catch (error) {
    console.error('[Coins API] Error getting customer data:', error);
    return null;
  }
}

/**
 * Check if a customer has a daily pass
 */
function checkIfDailyPass(customer: any): boolean {
  if (!customer?.SeatBookings?.length) {
    return false;
  }
  
  const latestBooking = customer.SeatBookings[0];
  if (!latestBooking?.Seat?.SeatingType) {
    return false;
  }
  
  const seatingType = latestBooking.Seat.SeatingType;
  return seatingType.short_code === 'DP' || seatingType.name === 'DAILY_PASS';
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
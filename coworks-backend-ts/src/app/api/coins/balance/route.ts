// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyAuth } from '@/utils/jwt';
import { corsHeaders } from '@/utils/jwt-wrapper';

/**
 * GET /api/coins/balance - Get current user's coin balance
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
    
    // Initialize coin balance if it doesn't exist
    await initializeUserCoins(userId);
    
    // Get user's coins
    const coins = await models.CustomerCoin.findOne({
      where: { customer_id: userId }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        balance: coins ? coins.balance : 0,
        customer_id: userId
      }
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('[Coins API] Error retrieving coin balance:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve coin balance',
      error: (error as Error).message
    }, { status: 500, headers: corsHeaders });
  }
}

/**
 * Initialize coin balance for new users
 */
async function initializeUserCoins(userId: number): Promise<void> {
  try {
    // Check if the user already has a coins record
    const existingCoins = await models.CustomerCoin.findOne({
      where: { customer_id: userId }
    });
    
    if (!existingCoins) {
      // Get user seating type to determine coin allocation
      const customer = await models.Customer.findByPk(userId, {
        include: [{
          model: models.SeatBooking,
          as: 'SeatBookings',
          limit: 1,
          order: [['created_at', 'DESC']],
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
      
      // Default allocation
      let coinBalance = 1196;
      let isDailyPass = false;
      
      // Check if user has any bookings
      if (customer?.SeatBookings?.length > 0) {
        const latestBooking = customer.SeatBookings[0];
        const seatingType = latestBooking?.Seat?.SeatingType;
        
        // If user has a daily pass, they get no coins
        if (seatingType?.short_code === 'DP' || seatingType?.name === 'DAILY_PASS') {
          coinBalance = 0;
          isDailyPass = true;
        }
      }
      
      // Create the coin record
      await models.CustomerCoin.create({
        customer_id: userId,
        balance: coinBalance,
        is_daily_pass: isDailyPass,
        last_updated: new Date()
      });
      
      console.log(`[Coins API] Initialized ${coinBalance} coins for user ${userId}`);
    }
  } catch (error) {
    console.error('[Coins API] Error initializing coins:', error);
    // Don't throw error to prevent the main API from failing
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
// src/app/api/admin/cleanup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredBookings } from '@/utils/bookingCleanup';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check for API key (for security)
    const apiKey = request.headers.get('x-api-key');
    const configuredApiKey = process.env.ADMIN_API_KEY;
    
    if (!configuredApiKey || apiKey !== configuredApiKey) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Run the cleanup
    const result = await cleanupExpiredBookings();
    
    return NextResponse.json({
      success: true,
      message: 'Cleanup completed successfully',
      data: {
        seatBookingsCompleted: result.seatBookings,
        meetingBookingsCompleted: result.meetingBookings
      }
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { success: false, message: 'Cleanup failed', error: (error as Error).message },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/middleware/adminAuth';
import models from '@/models';
import { Op } from 'sequelize';

/**
 * GET all bookings for admin
 * Includes detailed information about seats, customers, and branches
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin authentication
    const authResponse = await verifyAdminToken(request);
    if (authResponse) return authResponse;

    // Get URL parameters
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const branchId = url.searchParams.get('branchId');
    const seatingTypeId = url.searchParams.get('seatingTypeId');
    const customerId = url.searchParams.get('customerId');
    const status = url.searchParams.get('status');
    
    // Prepare date filter if provided
    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.start_time = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      dateFilter.start_time = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      dateFilter.start_time = {
        [Op.lte]: new Date(endDate)
      };
    }
    
    // Prepare customer filter if provided
    const customerFilter: any = {};
    if (customerId) {
      customerFilter.customer_id = parseInt(customerId);
    }
    
    // Prepare status filter if provided
    if (status) {
      dateFilter.status = status;
    }
    
    // Combine all filters
    const seatBookingWhereConditions = {
      ...dateFilter,
      ...customerFilter
    };
    
    // Prepare branch and seating type filters for includes
    const branchFilter: any = {};
    if (branchId) {
      branchFilter.id = parseInt(branchId);
    }
    
    const seatingTypeFilter: any = {};
    if (seatingTypeId) {
      seatingTypeFilter.id = parseInt(seatingTypeId);
    }
    
    // Fetch seat bookings
    const seatBookings = await models.SeatBooking.findAll({
      where: seatBookingWhereConditions,
      include: [
        { 
          model: models.Seat, 
          as: 'Seat',
          include: [
            { 
              model: models.Branch, 
              as: 'Branch',
              where: Object.keys(branchFilter).length > 0 ? branchFilter : undefined,
              attributes: [
                'id', 'name', 'address', 'location', 'short_code'
              ]
            },
            { 
              model: models.SeatingType, 
              as: 'SeatingType',
              where: Object.keys(seatingTypeFilter).length > 0 ? seatingTypeFilter : undefined,
              attributes: [
                'id', 'name', 'description', 'hourly_rate', 'is_hourly',
                'min_booking_duration', 'short_code'
              ]
            }
          ]
        },
        { 
          model: models.Customer, 
          as: 'Customer',
          attributes: ['id', 'name', 'email', 'phone', 'company_name']
        }
      ]
    }) as any[];

    // Fetch meeting bookings
    const meetingBookings = await models.MeetingBooking.findAll({
      where: seatBookingWhereConditions,
      include: [
        { 
          model: models.Seat, 
          as: 'MeetingRoom',
          include: [
            { 
              model: models.Branch, 
              as: 'Branch',
              where: Object.keys(branchFilter).length > 0 ? branchFilter : undefined,
              attributes: [
                'id', 'name', 'address', 'location', 'short_code'
              ]
            },
            { 
              model: models.SeatingType, 
              as: 'SeatingType',
              where: Object.keys(seatingTypeFilter).length > 0 ? seatingTypeFilter : undefined,
              attributes: [
                'id', 'name', 'description', 'hourly_rate', 'is_hourly',
                'min_booking_duration', 'short_code'
              ]
            }
          ]
        },
        { 
          model: models.Customer, 
          as: 'Customer',
          attributes: ['id', 'name', 'email', 'phone', 'company_name']
        }
      ]
    }) as any[];

    // Filter out bookings where Seat/MeetingRoom is null (when filtering by branch or seating type)
    const filteredSeatBookings = (branchId || seatingTypeId) 
      ? seatBookings.filter(booking => booking.Seat !== null)
      : seatBookings;

    const filteredMeetingBookings = (branchId || seatingTypeId)
      ? meetingBookings.filter(booking => booking.MeetingRoom !== null)
      : meetingBookings;

    // Combine both types of bookings and format the response
    const bookings = [...filteredSeatBookings, ...filteredMeetingBookings].map(booking => {
      const isSeatBooking = 'seat_id' in booking;
      const seatOrRoom = isSeatBooking ? booking.Seat : booking.MeetingRoom;
      
      return {
        id: booking.id,
        type: isSeatBooking ? 'seat' : 'meeting',
        customerId: booking.customer_id,
        customerName: booking.Customer?.name,
        customerEmail: booking.Customer?.email,
        seatId: isSeatBooking ? booking.seat_id : booking.meeting_room_id,
        seatNumber: seatOrRoom?.seat_number,
        seatingTypeName: seatOrRoom?.SeatingType?.name,
        seatingTypeCode: seatOrRoom?.SeatingType?.short_code,
        branchName: seatOrRoom?.Branch?.name,
        branchCode: seatOrRoom?.Branch?.short_code,
        startTime: booking.start_time,
        endTime: booking.end_time,
        totalPrice: booking.total_price,
        status: booking.status,
        createdAt: booking.created_at,
        updatedAt: booking.updated_at
      };
    });
    
    // Sort bookings by start time (most recent first)
    bookings.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    
    return NextResponse.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    console.error('Error fetching bookings for admin:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch bookings',
      error: (error as Error).message
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { ApiResponse } from '@/types/common';
import { Op, WhereOptions } from 'sequelize';
import { AvailabilityStatusEnum, SeatingTypeEnum } from '@/types/seating';

// Define types for our stats objects
interface SeatDetail {
  id: number;
  seat_code: string;
  seat_number: string;
  price: number;
  status: 'booked' | 'available';
  has_booking: boolean;
}

interface SeatingTypeStats {
  id: number;
  name: string;
  short_code: string;
  description: string;
  total_seats: number;
  available_seats: number;
  booked_seats: number;
  is_hourly: boolean;
  hourly_rate: number;
  seats: SeatDetail[];
}

interface BranchStats {
  id: number;
  name: string;
  short_code: string;
  address: string;
  location: string;
  opening_time: string;
  closing_time: string;
  total_seats: number;
  available_seats: number;
  booked_seats: number;
  seating_types: SeatingTypeStats[];
}

// GET branch stats with seat counts by type
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Extract query parameters
    const url = new URL(request.url);
    const branchCode = url.searchParams.get('branch_code');
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const startTime = url.searchParams.get('start_time');
    const endTime = url.searchParams.get('end_time');

    // Prepare where condition for branch
    let branchWhere: WhereOptions = {};
    if (branchCode) {
      branchWhere = { short_code: branchCode };
    }

    // Get all branches or just the one specified
    const branches = await models.Branch.findAll({
      where: branchWhere,
      attributes: [
        'id', 
        'name', 
        'short_code',
        'address',
        'location',
        'opening_time', 
        'closing_time'
      ],
      order: [['name', 'ASC']]
    });

    if (branches.length === 0) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: branchCode 
          ? `Branch with code ${branchCode} not found` 
          : 'No branches found',
        data: null
      }, { status: 404 });
    }

    // Get all seating types
    const seatingTypes = await models.SeatingType.findAll({
      attributes: [
        'id',
        'name',
        'short_code',
        'description',
        'hourly_rate',
        'is_hourly'
      ],
      order: [['name', 'ASC']]
    });

    const branchStats: BranchStats[] = [];

    // For each branch, calculate stats
    for (const branch of branches) {
      const branchSeatStats: BranchStats = {
        id: branch.id,
        name: branch.name,
        short_code: branch.short_code,
        address: branch.address,
        location: branch.location,
        opening_time: branch.opening_time,
        closing_time: branch.closing_time,
        total_seats: 0,
        available_seats: 0,
        booked_seats: 0,
        seating_types: []
      };

      // For each seating type, get seat counts
      for (const seatingType of seatingTypes) {
        // Get all seats for this branch and seating type
        const seats = await models.Seat.findAll({
          where: {
            branch_id: branch.id,
            seating_type_id: seatingType.id
          },
          attributes: ['id', 'seat_code', 'seat_number', 'availability_status', 'price']
        });

        const totalSeats = seats.length;
        
        // Count statically booked/available seats based on their status field
        const bookedSeats = seats.filter(
          seat => seat.availability_status === AvailabilityStatusEnum.BOOKED
        ).length;
        
        const availableSeats = seats.filter(
          seat => seat.availability_status === AvailabilityStatusEnum.AVAILABLE
        ).length;

        // Get all seat IDs
        const seatIds = seats.map(seat => seat.id);
        
        // Find dynamically booked seats (those with active bookings for the date/time)
        let dynamicallyBookedSeatIds = new Set<number>();
        
        if (seatIds.length > 0) {
          const bookingWhere: any = {
            seat_id: { [Op.in]: seatIds },
            status: { [Op.notIn]: ['CANCELLED'] }
          };
          
          // Add date/time filters if provided
          if (date) {
            if (seatingType.is_hourly && startTime && endTime) {
              // For hourly bookings, check specific time slots
              bookingWhere[Op.or] = [
                // Booking starts during our period
                {
                  start_time: {
                    [Op.between]: [
                      `${date}T${startTime}`, 
                      `${date}T${endTime}`
                    ]
                  }
                },
                // Booking ends during our period
                {
                  end_time: {
                    [Op.between]: [
                      `${date}T${startTime}`, 
                      `${date}T${endTime}`
                    ]
                  }
                },
                // Booking encompasses our period
                {
                  [Op.and]: [
                    { start_time: { [Op.lt]: `${date}T${startTime}` } },
                    { end_time: { [Op.gt]: `${date}T${endTime}` } }
                  ]
                }
              ];
            } else {
              // For full-day bookings, check the entire day
              const nextDay = new Date(date);
              nextDay.setDate(nextDay.getDate() + 1);
              const nextDayStr = nextDay.toISOString().split('T')[0];
              
              bookingWhere[Op.or] = [
                // Booking starts on our date
                {
                  start_time: {
                    [Op.between]: [
                      `${date}T00:00:00`, 
                      `${date}T23:59:59`
                    ]
                  }
                },
                // Booking ends on our date
                {
                  end_time: {
                    [Op.between]: [
                      `${date}T00:00:00`, 
                      `${date}T23:59:59`
                    ]
                  }
                },
                // Booking encompasses our date
                {
                  [Op.and]: [
                    { start_time: { [Op.lt]: `${date}T00:00:00` } },
                    { end_time: { [Op.gt]: `${nextDayStr}T00:00:00` } }
                  ]
                }
              ];
            }
          }
          
          // Find all bookings matching our criteria
          const bookings = await models.SeatBooking.findAll({
            where: bookingWhere,
            attributes: ['id', 'seat_id']
          });
          
          // Create a Set of all seat IDs with active bookings
          dynamicallyBookedSeatIds = new Set(bookings.map(booking => booking.seat_id));
        }
        
        // Count actual available seats taking bookings into account
        const actuallyAvailableSeats = seats.filter(
          seat => seat.availability_status === AvailabilityStatusEnum.AVAILABLE && 
                 !dynamicallyBookedSeatIds.has(seat.id)
        ).length;
        
        // Count total booked seats (statically booked + dynamically booked available seats)
        const actuallyBookedSeats = bookedSeats + 
          (seats.filter(
            seat => seat.availability_status === AvailabilityStatusEnum.AVAILABLE && 
                   dynamicallyBookedSeatIds.has(seat.id)
          ).length);

        // Get seat details with actual availability
        const seatDetails: SeatDetail[] = seats.map(seat => {
          const isBooked = seat.availability_status === AvailabilityStatusEnum.BOOKED || 
                          dynamicallyBookedSeatIds.has(seat.id);
          
          return {
            id: seat.id,
            seat_code: seat.seat_code,
            seat_number: seat.seat_number,
            price: seat.price,
            status: isBooked ? 'booked' : 'available',
            has_booking: dynamicallyBookedSeatIds.has(seat.id)
          };
        });

        // Add to seating type stats
        if (totalSeats > 0) {
          branchSeatStats.seating_types.push({
            id: seatingType.id,
            name: seatingType.name,
            short_code: seatingType.short_code,
            description: seatingType.description || '',
            total_seats: totalSeats,
            available_seats: actuallyAvailableSeats,
            booked_seats: actuallyBookedSeats,
            is_hourly: seatingType.is_hourly,
            hourly_rate: seatingType.hourly_rate,
            seats: seatDetails
          });
          
          // Update branch totals
          branchSeatStats.total_seats += totalSeats;
          branchSeatStats.available_seats += actuallyAvailableSeats;
          branchSeatStats.booked_seats += actuallyBookedSeats;
        }
      }
      
      branchStats.push(branchSeatStats);
    }

    return NextResponse.json<ApiResponse<BranchStats[]>>({
      success: true,
      message: 'Branch stats retrieved successfully',
      data: branchStats
    });
  } catch (error) {
    console.error('Error fetching branch stats:', error);
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to fetch branch stats',
      error: (error as Error).message,
      data: null
    }, { status: 500 });
  }
} 
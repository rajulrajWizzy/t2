// Use Node.js runtime for Sequelize compatibility
export const runtime = 'nodejs';

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { corsHeaders } from '@/utils/jwt-wrapper';
import { Op } from 'sequelize';
import { AvailabilityStatusEnum } from '@/types/seating';
import { calculateTotalPrice, applyQuantityDiscounts } from '@/utils/price-calculator';

interface Seat {
  id: string;
  name: string;
  seat_number: string;
  seat_code: string;
  price: number;
  availability_status: string;
  branch_id: string;
  branch_name: string;
  seating_type_id: string;
  seating_type_name: string;
  seating_type_code?: string;
  opening_time: string;
  closing_time: string;
}

interface TimeSlot {
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  is_available: boolean;
  reason?: string;
  booking_id?: string | null;
  maintenance_id?: string | null;
}

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface MaintenanceBlock {
  id: string;
  start_time: string;
  end_time: string;
  reason?: string;
}

// Helper function to calculate total amount
async function calculateTotalAmount(startDate: string, endDate: string, rate: number, quantity: number = 1, seatingTypeId?: string) {
  if (!rate) {
    return 0; // No price defined
  }
  
  let rateType: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'hourly';
  
  // Find the seating type to determine whether to use hourly/daily/monthly rate
  if (seatingTypeId) {
    const seatingType = await models.SeatingType.findByPk(seatingTypeId);
    
    if (seatingType) {
      if (seatingType.is_monthly) {
        rateType = 'monthly';
        rate = seatingType.monthly_rate || rate;
      } else if (seatingType.is_weekly) {
        rateType = 'weekly';
        rate = seatingType.weekly_rate || rate;
      } else if (seatingType.is_daily) {
        rateType = 'daily';
        rate = seatingType.daily_rate || rate;
      } else {
        // Default to hourly
        rate = seatingType.hourly_rate || rate;
      }
    }
  }
  
  // Calculate base price
  const basePrice = calculateTotalPrice(startDate, endDate, rate, quantity, rateType);
  
  return basePrice;
}

// GET availability for seats and branches
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    console.log('Request params:', Object.fromEntries(searchParams.entries()));
    
    // Required parameters
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    
    // Optional parameters
    const seatId = searchParams.get('seat_id');
    const branchId = searchParams.get('branch_id');
    const seatingTypeId = searchParams.get('seating_type_id');
    const seatingTypeCode = searchParams.get('seating_type_code');
    const quantityParam = searchParams.get('quantity');
    
    // Parse quantity if provided, default to 1
    const quantity = quantityParam ? parseInt(quantityParam, 10) : 1;
    
    // Validate quantity
    if (isNaN(quantity) || quantity < 1) {
      return NextResponse.json(
        { 
          error: "Invalid quantity", 
          details: "Quantity must be a positive integer",
          provided: { quantity: quantityParam }
        },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { 
          error: "Missing required parameters", 
          details: "Both start_date and end_date are required",
          provided: { start_date: startDate, end_date: endDate }
        },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Logic for different types of availability queries
    if (seatId) {
      // Get availability for a specific seat
      try {
        const seatAvailability = await getSeatAvailability(seatId, startDate, endDate, quantity);
        return NextResponse.json(seatAvailability, { headers: corsHeaders });
      } catch (error) {
        console.error("Error getting seat availability:", error);
        
        if (error instanceof Error && error.message && error.message.includes('not found')) {
          // Fetch a list of valid seat IDs to help the user
          try {
            const availableSeats = await models.Seat.findAll({
              limit: 5,
              attributes: ['id', 'seat_number', 'seat_code']
            });
            
            return NextResponse.json(
              { 
                error: "Error retrieving seat availability", 
                message: error.message,
                seat_id: seatId,
                help: "The requested seat ID was not found. Try using one of these valid seat IDs:",
                available_seats: availableSeats
              }, 
              { status: 404, headers: corsHeaders }
            );
          } catch (listError) {
            // Just return the original error if we can't fetch example seats
            return NextResponse.json(
              { 
                error: "Error retrieving seat availability", 
                message: error.message || "Unknown error",
                seat_id: seatId
              }, 
              { status: 404, headers: corsHeaders }
            );
          }
        } else {
          return NextResponse.json(
            { 
              error: "Error retrieving seat availability", 
              message: error instanceof Error ? error.message : "Unknown error",
              seat_id: seatId
            }, 
            { status: 500, headers: corsHeaders }
          );
        }
      }
    } else if (branchId) {
      // Get availability for a branch, optionally filtered by seating type
      try {
        const branchAvailability = await getBranchAvailability(
          branchId, 
          seatingTypeId, 
          seatingTypeCode, 
          startDate, 
          endDate,
          quantity
        );
        return NextResponse.json(branchAvailability, { headers: corsHeaders });
      } catch (error) {
        console.error("Error getting branch availability:", error);
        return NextResponse.json(
          { 
            error: "Error retrieving branch availability", 
            message: error instanceof Error ? error.message : "Unknown error",
            branch_id: branchId
          }, 
          { status: 404, headers: corsHeaders }
        );
      }
    } else {
      // No seat_id or branch_id provided
      return NextResponse.json(
        { 
          error: "Missing parameters", 
          details: "Either seat_id or branch_id must be provided"
        },
        { status: 400, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error("Unhandled error in availability API:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "An unexpected error occurred"
      }, 
      { status: 500, headers: corsHeaders }
    );
  }
}

// Helper function to get availability for a specific seat
async function getSeatAvailability(seatId: string, startDate: string, endDate: string, quantity: number = 1) {
  // First, get seat details using Sequelize model
  try {
    const seat = await models.Seat.findByPk(seatId, {
      include: [
        {
          model: models.Branch,
          as: 'Branch',
          attributes: ['id', 'name', 'short_code', 'location', 'opening_time', 'closing_time']
        },
        {
          model: models.SeatingType,
          as: 'SeatingType',
          attributes: ['id', 'name', 'short_code', 'hourly_rate', 'daily_rate', 'weekly_rate', 'monthly_rate', 'is_hourly', 'is_daily', 'is_weekly', 'is_monthly', 'cost_multiplier']
        }
      ]
    });
    
    if (!seat) {
      throw new Error(`Seat with ID ${seatId} not found`);
    }
    
    // Convert Sequelize model to plain object
    const seatData = seat.get({ plain: true });
    
    console.log('Seat data with seating type:', {
      seatId: seatData.id,
      seatingTypeId: seatData.SeatingType?.id,
      seatingTypeName: seatData.SeatingType?.name,
      hourlyRate: seatData.SeatingType?.hourly_rate,
      dailyRate: seatData.SeatingType?.daily_rate,
      weeklyRate: seatData.SeatingType?.weekly_rate,
      monthlyRate: seatData.SeatingType?.monthly_rate
    });
    
    // Get bookings for this seat using Sequelize
    const bookings = await models.SeatBooking.findAll({
      where: {
        seat_id: seatId,
        status: {
          [Op.notIn]: ['CANCELLED', 'COMPLETED']
        },
        [Op.or]: [
          {
            start_time: {
              [Op.between]: [startDate, endDate]
            }
          },
          {
            end_time: {
              [Op.between]: [startDate, endDate]
            }
          },
          {
            [Op.and]: [
              { start_time: { [Op.lte]: startDate } },
              { end_time: { [Op.gte]: endDate } }
            ]
          }
        ]
      },
      order: [['start_time', 'ASC']]
    });
    
    const formattedBookings = bookings.map(booking => ({
      id: booking.id,
      start_time: booking.start_time,
      end_time: booking.end_time,
      status: booking.status
    }));
    
    // Generate time slots for each day
    const timeSlots = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const date = d.toISOString().split('T')[0];
      const startTime = new Date(d);
      startTime.setHours(8, 0, 0, 0);
      const endTime = new Date(d);
      endTime.setHours(20, 0, 0, 0);

      // Find the relevant booking for this date (for info only)
      const relevantBooking = formattedBookings.find(b => {
        const bookingStart = new Date(b.start_time);
        const bookingEnd = new Date(b.end_time);
        return (
          // Test if the booking overlaps with this day
          (bookingStart <= endTime && bookingEnd >= startTime)
        );
      });

      // IMPORTANT FIX: First check seat status, then only disable if actually booked
      const statusIsAvailable = 
        seatData.availability_status.toUpperCase() === 'AVAILABLE' || 
        seatData.availability_status.toLowerCase() === 'available';
      
      // By default, seat is available if its status is available
      let isAvailable = statusIsAvailable;
      
      // Mark as unavailable if there's any booking
      if (relevantBooking) {
        isAvailable = false;
        console.log(`Seat ${seatId} is booked for ${date}, status: ${relevantBooking.status}`);
      }

      let reason = isAvailable ? 'Seat is AVAILABLE' : 'Seat is not available for this date';
      if (relevantBooking) {
        reason = 'Booked';
      }

      timeSlots.push({
        date,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        is_available: isAvailable,
        status: isAvailable ? 'available' : 'unavailable',
        booking_id: relevantBooking?.id || null,
        maintenance_id: null,
        reason
      });
    }
    
    // Calculate total amount based on duration and price
    if (!seatData.SeatingType) {
      console.error('No seating type found for seat:', seatData.id);
      return 0;
    }

    const seatingTypeId = seatData.SeatingType.id;
    const seatingType = seatData.SeatingType;

    // Calculate duration in days
    const bookingStart = new Date(startDate);
    const bookingEnd = new Date(endDate);
    const durationMs = bookingEnd.getTime() - bookingStart.getTime();
    const durationDays = durationMs / (1000 * 60 * 60 * 24);

    // Determine the appropriate rate based on duration
    let rate = seatingType.hourly_rate;
    if (durationDays >= 30 && seatingType.is_monthly && seatingType.monthly_rate) {
      rate = seatingType.monthly_rate;
    } else if (durationDays >= 7 && seatingType.is_weekly && seatingType.weekly_rate) {
      rate = seatingType.weekly_rate;
    } else if (durationDays >= 1 && seatingType.is_daily && seatingType.daily_rate) {
      rate = seatingType.daily_rate;
    }

    console.log('Using rate for calculation:', {
      seatingTypeId,
      rate,
      durationDays,
      hourly_rate: seatingType.hourly_rate,
      daily_rate: seatingType.daily_rate,
      weekly_rate: seatingType.weekly_rate,
      monthly_rate: seatingType.monthly_rate
    });

    const totalAmount = await calculateTotalAmount(
      startDate, 
      endDate, 
      rate, 
      quantity,
      seatingTypeId?.toString()
    );
    
    // Check if the requested quantity can be fulfilled
    const quantityAvailable = 1; // Individual seat is only 1
    const canFulfillQuantity = quantity <= quantityAvailable;
    
    return {
      seat: {
        id: seatData.id,
        name: seatData.seat_number || '',
        seat_number: seatData.seat_number,
        seat_code: seatData.seat_code,
        price: seatData.price,
        availability_status: seatData.availability_status,
        branch_id: seatData.Branch?.id,
        branch_name: seatData.Branch?.name,
        seating_type_id: seatData.SeatingType?.id,
        seating_type_name: seatData.SeatingType?.name
      },
      bookings: formattedBookings,
      maintenance_blocks: [],
      time_slots: timeSlots,
      pricing: {
        hourly_rate: seatingType?.hourly_rate || 0,
        daily_rate: seatingType?.daily_rate || 0, 
        weekly_rate: seatingType?.weekly_rate || 0,
        monthly_rate: seatingType?.monthly_rate || 0,
        currency: "INR", 
        start_date: startDate,
        end_date: endDate,
        total_amount: totalAmount,
        quantity: quantity,
        quantity_available: quantityAvailable
      },
      can_fulfill_quantity: canFulfillQuantity,
      availability_message: canFulfillQuantity ? 
        "The requested quantity can be fulfilled" : 
        `Only ${quantityAvailable} seat available, but ${quantity} requested`
    };
  } catch (error) {
    console.error(`Error in getSeatAvailability:`, error);
    throw error; // Re-throw to be handled by caller
  }
}

// Helper function to get availability for seats in a branch of a specific type
async function getBranchAvailability(
  branchId: string, 
  seatingTypeId: string | null, 
  seatingTypeCode: string | null, 
  startDate: string, 
  endDate: string,
  quantity: number = 1
) {
  try {
    // First, get branch details
    const branch = await models.Branch.findByPk(branchId);
    if (!branch) {
      throw new Error(`Branch with ID ${branchId} not found`);
    }

    // Build seating type query condition
    let seatingTypeQuery = '';
    let seatingTypeParams: Record<string, any> = {};
    
    if (seatingTypeId) {
      seatingTypeQuery = 'AND s.seating_type_id = :seatingTypeId';
      seatingTypeParams.seatingTypeId = seatingTypeId;
    } else if (seatingTypeCode) {
      seatingTypeQuery = 'AND st.short_code = :seatingTypeCode';
      seatingTypeParams.seatingTypeCode = seatingTypeCode;
    }

    // Prepare query conditions for seats
    const query = `
      SELECT s.*, 
        b.id as "Branch.id", 
        b.name as "Branch.name", 
        b.short_code as "Branch.short_code",
        b.location as "Branch.location",
        b.opening_time as "Branch.opening_time",
        b.closing_time as "Branch.closing_time",
        st.id as "SeatingType.id",
        st.name as "SeatingType.name",
        st.short_code as "SeatingType.short_code",
        st.hourly_rate as "SeatingType.hourly_rate",
        st.daily_rate as "SeatingType.daily_rate",
        st.weekly_rate as "SeatingType.weekly_rate",
        st.monthly_rate as "SeatingType.monthly_rate",
        st.is_hourly as "SeatingType.is_hourly",
        st.is_daily as "SeatingType.is_daily",
        st.is_weekly as "SeatingType.is_weekly",
        st.is_monthly as "SeatingType.is_monthly",
        st.capacity_options as "SeatingType.capacity_options"
      FROM "excel_coworks_schema"."seats" s
      JOIN "excel_coworks_schema"."branches" b ON s.branch_id = b.id
      JOIN "excel_coworks_schema"."seating_types" st ON s.seating_type_id = st.id
      WHERE s.branch_id = :branchId
      ${seatingTypeQuery}
      ORDER BY s.id ASC
    `;
    
    const replacements = { 
      branchId: Number(branchId),
      ...seatingTypeParams
    };
    
    // Execute query
    const seats = await models.sequelize.query(
      query,
      {
        replacements,
        type: 'SELECT' as const
      }
    );
    
    console.log(`Found ${seats.length} seats in branch ${branchId}`);
    
    // If no seats found, return empty result
    if (!seats || seats.length === 0) {
      return {
        branch_id: branchId,
        branch_name: branch.name,
        branch_location: branch.location,
        seating_type_id: seatingTypeId,
        seating_type_code: seatingTypeCode,
        seats: [],
        message: "No seats found matching the criteria",
        can_fulfill_quantity: false,
        quantity_available: 0,
        quantity_requested: quantity
      };
    }
    
    // For each seat, get availability
    const seatAvailability = await Promise.all(
      seats.map(async (seatData: any) => {
        if (!seatData) {
          console.warn('Null or undefined seat encountered in result set');
          return null;
        }
        
        // Ensure all required properties are present with defaults if missing
        const sanitizedSeat = {
          id: seatData.id || '',
          name: seatData.seat_number || '',
          seat_number: seatData.seat_number || '',
          seat_code: seatData.seat_code || '',
          price: typeof seatData.price === 'number' ? seatData.price : 0,
          availability_status: seatData.availability_status || 'UNAVAILABLE',
          seating_type_id: seatData['SeatingType.id'] || '',
          seating_type_name: seatData['SeatingType.name'] || '',
          seating_type_code: seatData['SeatingType.short_code'] || '',
          branch_id: seatData['Branch.id'] || '',
          branch_name: seatData['Branch.name'] || '',
          opening_time: seatData['Branch.opening_time'] || '09:00',
          closing_time: seatData['Branch.closing_time'] || '17:00',
          capacity: seatData.capacity || null,
          capacity_options: seatData['SeatingType.capacity_options'] || null
        };
        
        // Query for bookings using raw SQL to ensure we use the right schema
        const bookingsQuery = `
          SELECT id, seat_id, start_time, end_time, status 
          FROM "excel_coworks_schema"."seat_bookings" 
          WHERE seat_id = :seatId 
          AND status NOT IN ('CANCELLED')
          AND (
            (start_time < :endDate AND end_time > :startDate)
          )
          ORDER BY start_time ASC
        `;
        
        const bookings = await models.sequelize.query(
          bookingsQuery,
          {
            replacements: { 
              seatId: sanitizedSeat.id,
              startDate: startDate,
              endDate: endDate
            },
            type: 'SELECT' as const
          }
        );
        
        const formattedBookings = bookings.map((booking: any) => ({
          id: booking.id,
          start_time: booking.start_time,
          end_time: booking.end_time,
          status: booking.status
          }));
          
          // Generate time slots for each day
          const timeSlots = [];
          const start = new Date(startDate);
          const end = new Date(endDate);
          
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const date = d.toISOString().split('T')[0];
            const startTime = new Date(d);
            startTime.setHours(8, 0, 0, 0);
            const endTime = new Date(d);
            endTime.setHours(20, 0, 0, 0);
            
            // Find the relevant booking for this date (for info only)
            const relevantBooking = formattedBookings.find(b => {
              const bookingStart = new Date(b.start_time);
              const bookingEnd = new Date(b.end_time);
            return (
              // Test if the booking overlaps with this day
              (bookingStart <= endTime && bookingEnd >= startTime)
            );
            });

            // IMPORTANT FIX: First check seat status, then only disable if actually booked
            const statusIsAvailable = 
              sanitizedSeat.availability_status.toUpperCase() === 'AVAILABLE' || 
              sanitizedSeat.availability_status.toLowerCase() === 'available';
            
            // By default, seat is available if its status is available
            let isAvailable = statusIsAvailable;
            
            // Only mark as unavailable if there's an actual booking
            if (relevantBooking) {
              isAvailable = false;
              console.log(`Seat ${sanitizedSeat.id} is booked for ${date}`);
            }

            let reason = isAvailable ? 'Seat is AVAILABLE' : 'Seat is not available for this date';
            if (relevantBooking) {
              reason = 'Booked';
            }
            
            timeSlots.push({
              date,
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
              is_available: isAvailable,
              status: isAvailable ? 'available' : 'unavailable',
              booking_id: relevantBooking?.id || null,
              reason
            });
          }
          
          // Calculate total amount based on duration and price
        const seatingType = {
          id: seatData['SeatingType.id'],
          hourly_rate: seatData['SeatingType.hourly_rate'],
          daily_rate: seatData['SeatingType.daily_rate'],
          weekly_rate: seatData['SeatingType.weekly_rate'],
          monthly_rate: seatData['SeatingType.monthly_rate'],
          is_hourly: seatData['SeatingType.is_hourly'],
          is_daily: seatData['SeatingType.is_daily'],
          is_weekly: seatData['SeatingType.is_weekly'],
          is_monthly: seatData['SeatingType.is_monthly']
        };

        console.log('Seating type data:', seatingType);

        // Calculate duration in days
        const bookingStart = new Date(startDate);
        const bookingEnd = new Date(endDate);
        const durationMs = bookingEnd.getTime() - bookingStart.getTime();
        const durationDays = durationMs / (1000 * 60 * 60 * 24);

        // Determine the appropriate rate based on duration
        let rate = seatingType.hourly_rate;
        if (durationDays >= 30 && seatingType.is_monthly && seatingType.monthly_rate) {
          rate = seatingType.monthly_rate;
        } else if (durationDays >= 7 && seatingType.is_weekly && seatingType.weekly_rate) {
          rate = seatingType.weekly_rate;
        } else if (durationDays >= 1 && seatingType.is_daily && seatingType.daily_rate) {
          rate = seatingType.daily_rate;
        }

        console.log('Using rate for calculation:', {
          seatingTypeId: seatingType.id,
          rate,
          durationDays,
          hourly_rate: seatingType.hourly_rate,
          daily_rate: seatingType.daily_rate,
          weekly_rate: seatingType.weekly_rate,
          monthly_rate: seatingType.monthly_rate
        });

        const totalAmount = await calculateTotalAmount(
          startDate, 
          endDate, 
          rate, 
          1,
          seatingType.id?.toString()
        );
        
        return {
            seat: sanitizedSeat,
            bookings: formattedBookings,
            maintenance_blocks: [],
            time_slots: timeSlots,
            pricing: {
            hourly_rate: seatingType.hourly_rate || 0,
            daily_rate: seatingType.daily_rate || 0,
            weekly_rate: seatingType.weekly_rate || 0,
            monthly_rate: seatingType.monthly_rate || 0,
              currency: "INR", 
              start_date: startDate,
              end_date: endDate,
              total_amount: totalAmount
            },
            is_available: timeSlots.some(slot => slot.is_available)
          };
      })
    );
    
    // Filter out any null seat availability results
    const filteredAvailability = seatAvailability.filter(item => item !== null);
    
    // Calculate how many seats are available for the requested period
    const availableSeats = filteredAvailability.filter(item => item.is_available);
    const quantityAvailable = availableSeats.length;
    const canFulfillQuantity = quantity <= quantityAvailable;
    
    // Calculate total price based on the average seat price
    let averageSeatPrice = 0;
    if (availableSeats.length > 0) {
      const totalPrices = availableSeats.reduce((sum, seat) => sum + seat.pricing.total_amount, 0);
      averageSeatPrice = totalPrices / availableSeats.length;
    }
    
    const totalAmount = await calculateTotalAmount(
      startDate, 
      endDate, 
      averageSeatPrice, 
      quantity,
      seatingTypeId?.toString()
    );
    
    // Return structured availability information
    return {
      branch_id: branchId,
      branch_name: branch?.name || '',
      branch_location: branch?.location || '',
      // Make availability info more prominent
      availability_status: canFulfillQuantity ? 'AVAILABLE' : 'UNAVAILABLE',
      total_available_seats: quantityAvailable,
      total_price: totalAmount,
      currency: "INR",
      // Move these key availability indicators to the top level
      requested_quantity: quantity,
      can_fulfill_quantity: canFulfillQuantity,
      availability_message: canFulfillQuantity ? 
        "The requested quantity can be fulfilled" : 
        `Only ${quantityAvailable} seats available, but ${quantity} requested`,
      // Include the date range
      start_date: startDate,
      end_date: endDate,
      // Original fields now follow
      seating_type_id: seatingTypeId,
      seating_type_code: seatingTypeCode,
      seats: filteredAvailability,
      total_seats: filteredAvailability.length,
      available_seats: availableSeats.length,
      pricing: {
        average_price_per_day: averageSeatPrice,
        currency: "INR",
        start_date: startDate,
        end_date: endDate,
        total_amount: totalAmount,
        quantity: quantity
      }
    };
  } catch (error) {
    console.error('Error in getBranchAvailability:', error);
    throw error; // Re-throw to be handled by caller
  }
}

// Create test seats if they don't exist
async function ensureTestSeatsExist() {
  // This function is no longer needed as we're using Sequelize models
  return;
}
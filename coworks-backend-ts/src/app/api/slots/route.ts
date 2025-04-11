import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { Op } from 'sequelize';
import { verifyToken } from '@/utils/jwt';
import { ApiResponse } from '@/types/common';
import { TimeSlotGenerationParams } from '@/types/booking';
import { verifyProfileComplete } from '../middleware/verifyProfileComplete';
import { BookingStatusEnum } from '@/types/booking';

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Define interfaces for our response structure
interface SlotCategory {
  count: number;
  slots: any[];
}

interface SlotsBranchResponse {
  date: string;
  branch_id: number;
  total_slots: number;
  available: SlotCategory;
  booked: SlotCategory;
  maintenance: SlotCategory;
}

interface SlotGenerationResponse {
  count: number;
}

/**
 * GET /api/slots - Get all slots for a specific branch and date
 * 
 * Query parameters:
 * @param branch_id - ID of the branch (required)
 * @param seat_id - Filter by specific seat ID (optional)
 * @param seating_type_id - Filter by seating type ID (optional)
 * @param seating_type_code - Filter by seating type code (optional)
 * @param date - Date to get slots for (YYYY-MM-DD format, defaults to current date)
 * @param start_date - Alias for date parameter (YYYY-MM-DD format)
 * @param quantity - Requested capacity/quantity (defaults to 1)
 * @param start_time - Start time for hourly bookings (HH:MM format)
 * @param end_time - End time for hourly bookings (HH:MM format)
 * @param capacity - Required minimum capacity for meeting rooms
 * 
 * Response includes:
 * - Available slots with their status
 * - For meeting rooms: time-based availability with pricing information
 * - Total price calculation based on hourly rates and booking duration
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Make authentication optional
    let userId = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      // Verify the token
      const { valid, decoded } = await verifyToken(token);
      if (valid && decoded) {
        userId = decoded.userId;
        
        // Verify profile is complete with required documents
        const profileVerificationResponse = await verifyProfileComplete(request);
        if (profileVerificationResponse) {
          return profileVerificationResponse;
        }
      }
    }
    
    // Extract query parameters
    const url = new URL(request.url);
    const branch_id = url.searchParams.get('branch_id');
    const seat_id = url.searchParams.get('seat_id');
    const seating_type_id = url.searchParams.get('seating_type_id');
    const seating_type_code = url.searchParams.get('seating_type_code');
    const start_date = url.searchParams.get('start_date');
    const date = url.searchParams.get('date') || start_date || new Date().toISOString().split('T')[0];
    const quantity = parseInt(url.searchParams.get('quantity') || '1', 10);
    const start_time = url.searchParams.get('start_time');
    const end_time = url.searchParams.get('end_time');
    const capacity = url.searchParams.get('capacity');
    
    // Validate required filters
    if (!branch_id) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Branch ID is required',
        data: null
      };
      
      return NextResponse.json(response, { status: 400, headers: corsHeaders });
    }
    
    // Check if we have slots for this date/branch - if not, generate them automatically
    const existingSlots = await models.TimeSlot.count({
      where: {
        branch_id: parseInt(branch_id),
        date
      }
    });
    
    if (existingSlots === 0) {
      console.log(`No slots found for branch ${branch_id} on ${date}, generating them now...`);
      
      // Get the branch to access opening hours
      const branch = await models.Branch.findByPk(branch_id);
      if (!branch) {
        return NextResponse.json({
          success: false,
          message: 'Branch not found',
          data: null
        } as ApiResponse<null>, { status: 404, headers: corsHeaders });
      }
      
      // Prepare seating type filter
      let seatingTypeFilter = {};
      if (seating_type_code) {
        // Allow multiple code formats (case insensitive)
        const possibleCodes = [
          seating_type_code,
          seating_type_code.toUpperCase(),
          seating_type_code.toLowerCase()
        ];
        seatingTypeFilter = {
          short_code: {
            [Op.in]: possibleCodes
          }
        };
      }
      
      // Get all seats for this branch
      const seatsQuery: any = {
        where: {
          branch_id: parseInt(branch_id)
        },
        include: [{
          model: models.SeatingType,
          as: 'SeatingType',
          where: Object.keys(seatingTypeFilter).length ? seatingTypeFilter : undefined,
          required: true,
          attributes: ['id', 'name', 'short_code', 'hourly_rate', 'is_hourly']
        }]
      };
      
      const seats = await models.Seat.findAll(seatsQuery);
      
      if (seats.length > 0) {
        // Parse branch opening and closing hours
        const opening = branch.opening_time.split(':');
        const closing = branch.closing_time.split(':');
        
        const startHour = parseInt(opening[0]);
        const endHour = parseInt(closing[0]);
        
        // Create slots
        const newSlots = [];
        
        for (const seat of seats) {
          // Check if this is a meeting room by short code
          const isMeetingRoom = seat.SeatingType?.short_code === 'MR' || 
                               seat.SeatingType?.name === 'Meeting Room' ||
                               seat.SeatingType?.short_code === 'meet';
          
          // All seats should have hourly slots for consistency
          const interval = 1;
          
          // Generate slots for operating hours - for meeting rooms we don't care about seat status
          for (let hour = startHour; hour < endHour; hour += interval) {
            // Create time strings (HH:00:00 format)
            const startTime = `${hour.toString().padStart(2, '0')}:00:00`;
            const endTime = `${(hour + interval).toString().padStart(2, '0')}:00:00`;
            
            // Check if this time slot is already booked
            const existingBooking = await models.SeatBooking.findOne({
              where: {
                seat_id: seat.id,
                status: { [Op.notIn]: [BookingStatusEnum.CANCELLED, BookingStatusEnum.COMPLETED] },
                [Op.and]: [
                  { start_time: { [Op.lt]: `${date}T${endTime}` } },
                  { end_time: { [Op.gt]: `${date}T${startTime}` } }
                ]
              }
            });
            
            newSlots.push({
              branch_id: parseInt(branch_id),
              seat_id: parseInt(seat.id.toString()),
              date,
              start_time: startTime,
              end_time: endTime,
              is_available: !existingBooking, // Set availability based on existing bookings
              booking_id: existingBooking?.id || null,
              hourly_rate: parseFloat(seat.SeatingType?.hourly_rate || 0)
            });
          }
        }
        
        // Bulk create slots if any were generated
        if (newSlots.length > 0) {
          await models.TimeSlot.bulkCreate(newSlots);
          console.log(`Generated ${newSlots.length} slots for branch ${branch_id}`);
        }
      }
    }
    
    // Prepare filter conditions
    const whereConditions: any = {
      branch_id: parseInt(branch_id),
      date
    };
    
    // Add seat_id filter if provided
    if (seat_id) {
      whereConditions.seat_id = parseInt(seat_id);
    }
    
    // Add time range filters if provided (for hourly bookings like meeting rooms)
    if (start_time && end_time && seating_type_code?.toUpperCase() === 'MR') {
      // Format time strings if they don't include seconds
      const formattedStartTime = start_time.includes(':') && start_time.split(':').length === 2 ? `${start_time}:00` : start_time;
      const formattedEndTime = end_time.includes(':') && end_time.split(':').length === 2 ? `${end_time}:00` : end_time;
      
      whereConditions[Op.or] = [
        {
          start_time: {
            [Op.between]: [
              formattedStartTime, 
              formattedEndTime
            ]
          }
        },
        {
          end_time: {
            [Op.between]: [
              formattedStartTime, 
              formattedEndTime
            ]
          }
        }
      ];
    }
    
    // Prepare include for seating type filtering
    let seatingTypeWhere = {};
    if (seating_type_id) {
      seatingTypeWhere = { id: parseInt(seating_type_id) };
    } else if (seating_type_code) {
      // Allow for multiple code formats - both 'MR' and 'meet' should work for meeting rooms
      const possibleCodes = [
        seating_type_code,
        seating_type_code.toUpperCase(),
        seating_type_code.toLowerCase()
      ];
      seatingTypeWhere = { 
        [Op.or]: [
          { short_code: { [Op.in]: possibleCodes } }
        ]
      };
    }
    
    // Additional filter for capacity if it's a meeting room request
    let seatWhere = {};
    if (capacity && seating_type_code?.toUpperCase() === 'MR') {
      const capacityValue = parseInt(capacity);
      if (!isNaN(capacityValue)) {
        seatWhere = { capacity: { [Op.gte]: capacityValue } };
      }
    }
    
    // Get branch attributes to include - check if short_code exists to prevent errors
    const branchAttributes = ['id', 'name', 'address'];
    
    // Find all time slots matching the filters, including those that are not available
    const timeSlots = await models.TimeSlot.findAll({
      where: whereConditions,
      order: [['start_time', 'ASC']],
      include: [
        {
          model: models.Branch,
          as: 'Branch',
          attributes: branchAttributes
        },
        {
          model: models.Seat,
          as: 'Seat',
          where: Object.keys(seatWhere).length ? seatWhere : undefined,
          attributes: ['id', 'seat_number', 'price', 'capacity', 'availability_status'],
          include: [
            {
              model: models.SeatingType,
              as: 'SeatingType',
              where: Object.keys(seatingTypeWhere).length ? seatingTypeWhere : undefined,
              attributes: ['id', 'name', 'short_code', 'hourly_rate', 'is_hourly', 'capacity_options']
            }
          ]
        },
        {
          model: models.SeatBooking,
          as: 'Booking',
          required: false,
          where: {
            status: { [Op.notIn]: [BookingStatusEnum.CANCELLED, BookingStatusEnum.COMPLETED] }
          },
          attributes: ['id', 'status', 'start_time', 'end_time']
        }
      ]
    }) as any[];
    
    // For meeting rooms, we need to check if we have capacity for the quantity requested
    const isMeetingRoomRequest = seating_type_code?.toUpperCase() === 'MR';
    
    // Group slots by time for meeting rooms
    const timeSlotMap = new Map();
    
    // Categorize slots by status
    const availableSlots = [];
    const bookedSlots = [];
    const maintenanceSlots = [];
    
    for (const slot of timeSlots) {
      // Check if the slot is booked
      const isBooked = slot.Booking && slot.Booking.length > 0;
      const bookingStatus = isBooked ? slot.Booking[0].status : null;
      
      // For meeting rooms, check capacity
      if (isMeetingRoomRequest && capacity) {
        const slotCapacity = slot.Seat?.capacity || 0;
        const requestedCapacity = parseInt(capacity);
        
        if (slotCapacity < requestedCapacity) {
          continue; // Skip slots that don't meet capacity requirements
        }
      }
      
      if (slot.Seat?.availability_status === 'MAINTENANCE') {
        maintenanceSlots.push({
          ...slot.toJSON(),
          status: 'MAINTENANCE',
          status_message: 'Under maintenance'
        });
      } else if (isBooked) {
        bookedSlots.push({
          ...slot.toJSON(),
          status: bookingStatus,
          status_message: `Booked (${bookingStatus})`,
          booking_details: slot.Booking[0]
        });
      } else if (slot.is_available && slot.Seat?.availability_status === 'AVAILABLE') {
        availableSlots.push({
          ...slot.toJSON(),
          status: 'AVAILABLE',
          status_message: 'Available'
        });
      }
    }
    
    // For meeting rooms, transform the grouped time slots
    let formattedTimeSlots = [];
    let canFulfillQuantity = false;
    
    if (isMeetingRoomRequest) {
      // Group available slots by time
      const timeGroups = new Map();
      
      // Generate all 24 hours
      for (let hour = 0; hour < 24; hour++) {
        const startTime = `${hour.toString().padStart(2, '0')}:00:00`;
        const endTime = `${((hour + 1) % 24).toString().padStart(2, '0')}:00:00`;
        const timeKey = `${startTime}-${endTime}`;
        
        timeGroups.set(timeKey, {
          start_time: startTime,
          end_time: endTime,
          date: date,
          rooms: [],
          total_capacity: 0,
          available_rooms: 0
        });
      }
      
      // Populate with actual available slots
      for (const slot of availableSlots) {
        const timeKey = `${slot.start_time}-${slot.end_time}`;
        if (timeGroups.has(timeKey)) {
          const group = timeGroups.get(timeKey);
          group.rooms.push({
            id: slot.seat_id,
            capacity: slot.Seat.capacity,
            hourly_rate: parseFloat(slot.Seat.SeatingType.hourly_rate)
          });
          group.total_capacity += slot.Seat.capacity;
          group.available_rooms++;
        }
      }
      
      // Convert the map to an array of time slots with meeting room info
      formattedTimeSlots = Array.from(timeGroups.values()).map(slot => {
        // Check if this time slot can fulfill the requested capacity
        const hasCapacity = slot.total_capacity >= quantity;
        const hasAvailableRooms = slot.available_rooms > 0;
        
        // A time slot is available if it has both capacity and available rooms
        const isAvailable = hasCapacity && hasAvailableRooms;
        
        // If any time slot can fulfill the quantity, set the global flag
        if (isAvailable) {
          canFulfillQuantity = true;
        }
        
        // Calculate the hourly rate from the rooms
        const hourlyRate = slot.rooms.length > 0 
          ? slot.rooms.reduce((max, room) => Math.max(max, room.hourly_rate), 0)
          : 0;
        
        // Calculate booking duration in hours (always 1 hour for each slot)
        const durationHours = 1;
        
        // Calculate price for this time slot
        const price = hourlyRate * durationHours;
        
        return {
          date: slot.date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_available: isAvailable,
          status: isAvailable ? 'available' : 'unavailable',
          reason: isAvailable ? 'Available' : (hasAvailableRooms ? 'Insufficient capacity' : 'No rooms available'),
          requested_capacity: quantity,
          total_capacity: slot.total_capacity,
          available_rooms: slot.available_rooms,
          hourly_rate: hourlyRate,
          duration_hours: durationHours,
          price: price,
          rooms: slot.rooms
        };
      });
      
      // Sort time slots by time
      formattedTimeSlots.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.start_time.localeCompare(b.start_time);
      });
    }
    
    const responseData: any = {
      date,
      branch_id: parseInt(branch_id),
      total_slots: formattedTimeSlots.length, // Show total number of slots (24)
      available: {
        count: availableSlots.length,
        slots: availableSlots
      },
      booked: {
        count: bookedSlots.length,
        slots: bookedSlots
      },
      maintenance: {
        count: maintenanceSlots.length,
        slots: maintenanceSlots
      }
    };
    
    // For meeting rooms, add the time-based consolidated view
    if (isMeetingRoomRequest) {
      // Calculate total price for all available time slots
      const availableSlots = formattedTimeSlots.filter(slot => slot.is_available);
      const totalPrice = availableSlots.reduce((sum, slot) => sum + slot.price, 0);
      
      // Calculate hourly rates statistics
      const availableHourlyRates = availableSlots.map(slot => slot.hourly_rate).filter(rate => rate > 0);
      const hourlyRates = availableHourlyRates.length > 0 ? {
        min: Math.min(...availableHourlyRates),
        max: Math.max(...availableHourlyRates),
        avg: availableHourlyRates.reduce((sum, rate) => sum + rate, 0) / availableHourlyRates.length
      } : null;
      
      responseData.meeting_room_availability = {
        time_slots: formattedTimeSlots,
        can_fulfill_quantity: canFulfillQuantity,
        requested_capacity: quantity,
        time_slot_count: formattedTimeSlots.length,
        available_time_slots: availableSlots.length,
        hourly_rates: hourlyRates,
        price_calculation: {
          total_price: totalPrice,
          currency: 'INR',
          total_duration_hours: availableSlots.reduce((sum, slot) => sum + slot.duration_hours, 0)
        }
      };
    }
    
    const response: ApiResponse<typeof responseData> = {
      success: true,
      message: 'Slots retrieved successfully',
      data: responseData
    };
    
    return NextResponse.json(response, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching time slots:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      message: 'Failed to fetch time slots',
      error: (error as Error).message,
      data: null
    };
    
    return NextResponse.json(response, { status: 500, headers: corsHeaders });
  }
}

// Generate time slots for a specific date and branch
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Unauthorized',
        data: null
      };
      
      return NextResponse.json(response, { status: 401, headers: corsHeaders });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Unauthorized',
        data: null
      };
      
      return NextResponse.json(response, { status: 401, headers: corsHeaders });
    }
    
    // Parse the request body
    const body = await request.json() as TimeSlotGenerationParams;
    const { branch_id, date, regenerate, seating_type_code } = body;
    
    // Validate input
    if (!branch_id || !date) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Branch ID and date are required',
        data: null
      };
      
      return NextResponse.json(response, { status: 400, headers: corsHeaders });
    }
    
    // Check if branch exists
    const branch = await models.Branch.findByPk(branch_id);
    if (!branch) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Branch not found',
        data: null
      };
      
      return NextResponse.json(response, { status: 404, headers: corsHeaders });
    }
    
    // If regenerate is true, delete existing slots for this branch and date
    if (regenerate) {
      let whereCondition: any = {
        branch_id,
        date,
        is_available: true, // Only delete available slots
        booking_id: null    // Don't delete booked slots
      };
      
      await models.TimeSlot.destroy({
        where: whereCondition
      });
    }
    
    // Check if slots already exist
    const existingSlots = await models.TimeSlot.count({
      where: {
        branch_id,
        date
      }
    });
    
    if (existingSlots > 0 && !regenerate) {
      const generationResponse: SlotGenerationResponse = { count: existingSlots };
      
      const response: ApiResponse<SlotGenerationResponse> = {
        success: false,
        message: 'Time slots already exist for this branch and date. Set regenerate to true to recreate.',
        data: generationResponse
      };
      
      return NextResponse.json(response, { headers: corsHeaders });
    }
    
    // Prepare seating type filter
    let seatingTypeFilter = {};
    if (seating_type_code) {
      // Support multiple formats of the same code
      const possibleCodes = [
        seating_type_code,
        seating_type_code.toUpperCase(),
        seating_type_code.toLowerCase()
      ];
      seatingTypeFilter = {
        short_code: {
          [Op.in]: possibleCodes
        }
      };
    }
    
    // Get all seats for this branch
    const seatsQuery: any = {
      where: {
        branch_id
      },
      include: [{
        model: models.SeatingType,
        as: 'SeatingType',
        where: Object.keys(seatingTypeFilter).length ? seatingTypeFilter : undefined,
        required: true,
        attributes: ['id', 'name', 'short_code', 'hourly_rate', 'is_hourly']
      }]
    };
    
    const seats = await models.Seat.findAll(seatsQuery);
    
    if (seats.length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'No seats found for this branch with the specified criteria',
        data: null
      };
      
      return NextResponse.json(response, { status: 404, headers: corsHeaders });
    }
    
    // Parse branch opening and closing hours
    const opening = branch.opening_time.split(':');
    const closing = branch.closing_time.split(':');
    
    const startHour = parseInt(opening[0]);
    const endHour = parseInt(closing[0]);
    
    // Create slots
    const newSlots = [];
    
    for (const seat of seats) {
      // Check if this is a meeting room by short code
      const isMeetingRoom = seat.SeatingType?.short_code === 'MR' || 
                           seat.SeatingType?.name === 'Meeting Room' ||
                           seat.SeatingType?.short_code === 'meet';
      
      // All seats should have hourly slots for consistency
      const interval = 1;
      
      // Generate slots for operating hours - for meeting rooms we don't care about seat status
      for (let hour = startHour; hour < endHour; hour += interval) {
        // Create time strings (HH:00:00 format)
        const startTime = `${hour.toString().padStart(2, '0')}:00:00`;
        const endTime = `${(hour + interval).toString().padStart(2, '0')}:00:00`;
        
        // Check if this time slot is already booked
        const existingBooking = await models.SeatBooking.findOne({
          where: {
            seat_id: seat.id,
            status: { [Op.notIn]: [BookingStatusEnum.CANCELLED, BookingStatusEnum.COMPLETED] },
            [Op.and]: [
              { start_time: { [Op.lt]: `${date}T${endTime}` } },
              { end_time: { [Op.gt]: `${date}T${startTime}` } }
            ]
          }
        });
        
        newSlots.push({
          branch_id: parseInt(branch_id),
          seat_id: parseInt(seat.id.toString()),
          date,
          start_time: startTime,
          end_time: endTime,
          is_available: !existingBooking, // Set availability based on existing bookings
          booking_id: existingBooking?.id || null,
          hourly_rate: parseFloat(seat.SeatingType?.hourly_rate || 0)
        });
      }
    }
    
    // Bulk create slots
    const createdSlots = await models.TimeSlot.bulkCreate(newSlots);
    
    const generationResponse: SlotGenerationResponse = { count: createdSlots.length };
    
    const response: ApiResponse<SlotGenerationResponse> = {
      success: true,
      message: 'Time slots created successfully',
      data: generationResponse
    };
    
    return NextResponse.json(response, { headers: corsHeaders });
  } catch (error) {
    console.error('Error creating time slots:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      message: 'Failed to create time slots',
      error: (error as Error).message,
      data: null
    };
    
    return NextResponse.json(response, { status: 500, headers: corsHeaders });
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}
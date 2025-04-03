// Use Node.js runtime for Sequelize compatibility
export const runtime = 'nodejs';

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { corsHeaders } from '@/utils/jwt-wrapper';

interface Seat {
  id: string;
  name: string;
  seat_number: string;
  seat_code: string;
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
    
    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { 
          error: "Missing required parameters", 
          details: "Both start_date and end_date are required",
          provided: { start_date: startDate, end_date: endDate }
        },
        { status: 400 }
      );
    }
    
    // Create bookings table if it does not exist
    try {
      await models.sequelize.query(`
        -- Create the uuid extension if it doesn't exist
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

        CREATE TABLE IF NOT EXISTS excel_coworks_schema.bookings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          seat_id UUID REFERENCES excel_coworks_schema.seats(id),
          user_id UUID,
          start_time TIMESTAMP WITH TIME ZONE NOT NULL,
          end_time TIMESTAMP WITH TIME ZONE NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          booking_reference VARCHAR(100),
          notes TEXT,
          price DECIMAL(10, 2),
          currency VARCHAR(10) DEFAULT 'USD',
          payment_status VARCHAR(50) DEFAULT 'unpaid',
          checkin_time TIMESTAMP WITH TIME ZONE,
          checkout_time TIMESTAMP WITH TIME ZONE
        );
        
        CREATE TABLE IF NOT EXISTS excel_coworks_schema.maintenance_blocks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          seat_id UUID REFERENCES excel_coworks_schema.seats(id),
          start_time TIMESTAMP WITH TIME ZONE NOT NULL,
          end_time TIMESTAMP WITH TIME ZONE NOT NULL,
          reason TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_by UUID,
          notes TEXT
        );
      `);
    } catch (error: any) {
      console.warn("Error creating tables:", error);
      // Continue as tables might already exist
    }
    
    // Ensure we have test seats available
    await ensureTestSeatsExist();
    
    // Logic for different types of availability queries
    if (seatId) {
      // Get availability for a specific seat
      try {
        const seatAvailability = await getSeatAvailability(seatId, startDate, endDate);
        return NextResponse.json(seatAvailability);
      } catch (error: any) {
        console.error("Error getting seat availability:", error);
        
        if (error.message && error.message.includes('not found')) {
          // Fetch a list of valid seat IDs to help the user
          try {
            const [seatsList] = await models.sequelize.query(`
              SELECT id, name, seat_number FROM excel_coworks_schema.seats LIMIT 5
            `);
            return NextResponse.json(
              { 
                error: "Error retrieving seat availability", 
                message: error.message,
                seat_id: seatId,
                help: "The requested seat ID was not found. Try using one of these valid seat IDs:",
                available_seats: seatsList
              }, 
              { status: 404 }
            );
          } catch (listError) {
            // Just return the original error if we can't fetch example seats
            return NextResponse.json(
              { 
                error: "Error retrieving seat availability", 
                message: error.message || "Unknown error",
                seat_id: seatId
              }, 
              { status: 404 }
            );
          }
        } else {
          return NextResponse.json(
            { 
              error: "Error retrieving seat availability", 
              message: error.message || "Unknown error",
              seat_id: seatId
            }, 
            { status: 500 }
          );
        }
      }
    } else if (branchId) {
      // Get availability for a branch, optionally filtered by seating type
      // We now allow querying by branch_id without requiring seating type parameters
      
      try {
        const branchAvailability = await getBranchAvailability(
          branchId, 
          seatingTypeId, 
          seatingTypeCode, 
          startDate, 
          endDate
        );
        return NextResponse.json(branchAvailability);
      } catch (error: any) {
        console.error("Error getting branch availability:", error);
        return NextResponse.json(
          { 
            error: "Error retrieving branch availability", 
            message: error.message || "Unknown error",
            branch_id: branchId
          }, 
          { status: 404 }
        );
      }
    } else {
      // No seat_id or branch_id provided
      return NextResponse.json(
        { 
          error: "Missing parameters", 
          details: "Either seat_id or branch_id must be provided"
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Unhandled error in availability API:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error.message || "An unexpected error occurred"
      }, 
      { status: 500 }
    );
  }
}

// Helper function to get availability for a specific seat
async function getSeatAvailability(seatId: string, startDate: string, endDate: string) {
  // First, get seat details
  try {
    const seatQuery = `
      SELECT 
        s.id, s.name, s.seat_number, s.seat_code, s.availability_status,
        b.id as branch_id, b.name as branch_name, b.opening_time, b.closing_time,
        st.id as seating_type_id, st.name as seating_type_name
      FROM 
        excel_coworks_schema.seats s
      JOIN
        excel_coworks_schema.branches b ON s.branch_id = b.id
      JOIN
        excel_coworks_schema.seating_types st ON s.seating_type_id = st.id
      WHERE 
        s.id = '${seatId}'
    `;
    
    const [seatsResult] = await models.sequelize.query(seatQuery);
    if (!seatsResult || seatsResult.length === 0) {
      throw new Error(`Seat with ID ${seatId} not found`);
    }
    
    // Type assertion to get proper typing
    const seats = seatsResult as unknown as Seat[];
    const seat = seats[0];
    
    // Get existing bookings for this seat in the date range
    const bookingsQuery = `
      SELECT 
        id, start_time, end_time, status
      FROM 
        excel_coworks_schema.bookings
      WHERE 
        seat_id = '${seat.id}'
        AND status IN ('confirmed', 'pending')
        AND (
          (start_time BETWEEN '${startDate}' AND '${endDate}')
          OR (end_time BETWEEN '${startDate}' AND '${endDate}')
          OR (start_time <= '${startDate}' AND end_time >= '${endDate}')
        )
      ORDER BY
        start_time
    `;
    
    let bookings: Booking[] = [];
    try {
      const [bookingsResult] = await models.sequelize.query(bookingsQuery);
      // Type assertion
      bookings = bookingsResult as unknown as Booking[];
    } catch (error: any) {
      console.warn("Error querying bookings:", error);
      // Continue without bookings
    }
    
    // Get any maintenance blocks
    const maintenanceQuery = `
      SELECT 
        id, start_time, end_time, reason
      FROM 
        excel_coworks_schema.maintenance_blocks
      WHERE 
        seat_id = '${seat.id}'
        AND (
          (start_time BETWEEN '${startDate}' AND '${endDate}')
          OR (end_time BETWEEN '${startDate}' AND '${endDate}')
          OR (start_time <= '${startDate}' AND end_time >= '${endDate}')
        )
      ORDER BY
        start_time
    `;
    
    let maintenanceBlocks: MaintenanceBlock[] = [];
    try {
      const [blocksResult] = await models.sequelize.query(maintenanceQuery);
      maintenanceBlocks = blocksResult as unknown as MaintenanceBlock[];
    } catch (error: any) {
      console.warn("Maintenance blocks table may not exist:", error);
      // Continue without maintenance blocks
    }
    
    // Process the time slots
    const timeSlots = generateTimeSlots(startDate, endDate, seat.opening_time, seat.closing_time);
    const availability = processAvailability(timeSlots, bookings, maintenanceBlocks, seat.availability_status);
    
    return {
      seat: {
        id: seat.id,
        name: seat.name,
        seat_number: seat.seat_number,
        seat_code: seat.seat_code,
        availability_status: seat.availability_status,
        branch_id: seat.branch_id,
        branch_name: seat.branch_name,
        seating_type_id: seat.seating_type_id,
        seating_type_name: seat.seating_type_name
      },
      bookings,
      maintenance: maintenanceBlocks,
      time_slots: availability
    };
  } catch (error: any) {
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
  endDate: string
) {
  try {
    // First, get seats in this branch of the specified type
    let seatingTypeCondition = '';
    if (seatingTypeId) {
      seatingTypeCondition = `AND s.seating_type_id = '${seatingTypeId}'`;
    } else if (seatingTypeCode) {
      seatingTypeCondition = `AND st.short_code = '${seatingTypeCode}'`;
    }
    // If neither seatingTypeId nor seatingTypeCode is provided, we'll return all seats in the branch
    
    const seatsQuery = `
      SELECT 
        s.id, s.name, s.seat_number, s.seat_code, s.availability_status,
        b.id as branch_id, b.name as branch_name, b.opening_time, b.closing_time,
        st.id as seating_type_id, st.name as seating_type_name, st.short_code as seating_type_code
      FROM 
        excel_coworks_schema.seats s
      JOIN
        excel_coworks_schema.branches b ON s.branch_id = b.id
      JOIN
        excel_coworks_schema.seating_types st ON s.seating_type_id = st.id
      WHERE 
        s.branch_id = '${branchId}'
        ${seatingTypeCondition}
      ORDER BY
        s.id
    `;
    
    console.log('Branch seats query:', seatsQuery);
    
    const [seatsResult] = await models.sequelize.query(seatsQuery);
    // Type assertion
    const seats = seatsResult as unknown as Seat[];
    
    if (!seats || seats.length === 0) {
      return {
        branch_id: branchId,
        seating_type_id: seatingTypeId,
        seating_type_code: seatingTypeCode,
        seats: [],
        message: "No seats found matching the criteria"
      };
    }
    
    console.log(`Found ${seats.length} seats in branch ${branchId}`);
    
    // For each seat, get availability
    const seatAvailability = await Promise.all(
      seats.map(async (seat: Seat) => {
        // Get bookings for this seat
        const bookingsQuery = `
          SELECT 
            id, start_time, end_time, status
          FROM 
            excel_coworks_schema.bookings
          WHERE 
            seat_id = '${seat.id}'
            AND status IN ('confirmed', 'pending')
            AND (
              (start_time BETWEEN '${startDate}' AND '${endDate}')
              OR (end_time BETWEEN '${startDate}' AND '${endDate}')
              OR (start_time <= '${startDate}' AND end_time >= '${endDate}')
            )
          ORDER BY
            start_time
        `;
        
        let bookings: Booking[] = [];
        try {
          const [bookingsResult] = await models.sequelize.query(bookingsQuery);
          bookings = bookingsResult as unknown as Booking[];
        } catch (error: any) {
          console.warn(`Error querying bookings for seat ${seat.id}:`, error);
          // Continue without bookings
        }
        
        // Process availability
        const timeSlots = generateTimeSlots(startDate, endDate, seat.opening_time, seat.closing_time);
        const availability = processAvailability(timeSlots, bookings, [], seat.availability_status);
        
        return {
          id: seat.id,
          name: seat.name,
          seat_number: seat.seat_number,
          seat_code: seat.seat_code,
          availability_status: seat.availability_status,
          seating_type_id: seat.seating_type_id,
          seating_type_name: seat.seating_type_name,
          seating_type_code: seat.seating_type_code,
          availability: availability
        };
      })
    );
    
    return {
      branch_id: branchId,
      branch_name: seats[0].branch_name,
      seating_type_id: seatingTypeId || seats[0].seating_type_id,
      seating_type_name: seats[0].seating_type_name,
      seating_type_code: seatingTypeCode || seats[0].seating_type_code,
      date_range: {
        start_date: startDate,
        end_date: endDate
      },
      seats: seatAvailability
    };
  } catch (error: any) {
    console.error(`Error in getBranchAvailability:`, error);
    throw error; // Re-throw to be handled by caller
  }
}

// Helper function to generate time slots for a date range
function generateTimeSlots(startDate: string, endDate: string, openingTime: string, closingTime: string): TimeSlot[] {
  try {
    const slots: TimeSlot[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Format as YYYY-MM-DD
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };
    
    // Create slots for each day in the range
    for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
      const dateStr = formatDate(day);
      
      // Add a full-day slot for each day
      slots.push({
        date: dateStr,
        start_time: `${dateStr}T${openingTime}:00`,
        end_time: `${dateStr}T${closingTime}:00`,
        is_available: true, // Default to available, will be updated later
        status: 'available',
        booking_id: null,
        maintenance_id: null
      });
    }
    
    return slots;
  } catch (error: any) {
    console.error('Error generating time slots:', error);
    // Return empty array if there's an error
    return [];
  }
}

// Helper function to process availability based on bookings and maintenance blocks
function processAvailability(
  timeSlots: TimeSlot[], 
  bookings: Booking[], 
  maintenanceBlocks: MaintenanceBlock[],
  seatAvailabilityStatus: string
): TimeSlot[] {
  try {
    // If seat is not generally available, mark all slots as unavailable
    if (seatAvailabilityStatus !== 'available') {
      return timeSlots.map(slot => ({
        ...slot,
        is_available: false,
        status: 'unavailable',
        reason: `Seat is ${seatAvailabilityStatus}`
      }));
    }
    
    // Clone the time slots to avoid modifying the original
    const processedSlots = [...timeSlots];
    
    // For each slot, check if it overlaps with any booking or maintenance block
    for (const slot of processedSlots) {
      const slotStart = new Date(slot.start_time);
      const slotEnd = new Date(slot.end_time);
      
      // Check bookings first
      for (const booking of bookings) {
        const bookingStart = new Date(booking.start_time);
        const bookingEnd = new Date(booking.end_time);
        
        // Check if there's an overlap
        if (
          (bookingStart <= slotEnd && bookingEnd >= slotStart) ||
          (slotStart <= bookingEnd && slotEnd >= bookingStart)
        ) {
          slot.is_available = false;
          slot.status = 'booked';
          slot.booking_id = booking.id;
          slot.reason = 'Reserved by another user';
          break; // No need to check other bookings if already booked
        }
      }
      
      // If not booked, check for maintenance blocks
      if (slot.is_available && maintenanceBlocks.length > 0) {
        for (const block of maintenanceBlocks) {
          const blockStart = new Date(block.start_time);
          const blockEnd = new Date(block.end_time);
          
          // Check if there's an overlap
          if (
            (blockStart <= slotEnd && blockEnd >= slotStart) ||
            (slotStart <= blockEnd && slotEnd >= blockStart)
          ) {
            slot.is_available = false;
            slot.status = 'maintenance';
            slot.maintenance_id = block.id;
            slot.reason = block.reason || 'Under maintenance';
            break;
          }
        }
      }
    }
    
    return processedSlots;
  } catch (error: any) {
    console.error('Error processing availability:', error);
    // Return original slots marked as error
    return timeSlots.map(slot => ({
      ...slot,
      is_available: false,
      status: 'error',
      reason: 'Error processing availability'
    }));
  }
}

// Create test seats if they don't exist
async function ensureTestSeatsExist() {
  try {
    // Check if we have seats
    const checkQuery = `
      SELECT COUNT(*) as seat_count FROM excel_coworks_schema.seats
    `;
    const [countResult] = await models.sequelize.query(checkQuery);
    const seatCount = parseInt((countResult[0] as { seat_count: string })?.seat_count || '0');
    
    if (seatCount === 0) {
      console.log('No seats found, creating test seats...');
      
      // Create test branch if needed
      await models.sequelize.query(`
        INSERT INTO excel_coworks_schema.branches (
          id, name, short_code, address, city, state, country, postal_code, 
          phone, email, opening_time, closing_time, created_at, updated_at
        )
        SELECT 
          gen_random_uuid(), 'Test Branch', 'TEST', '123 Test St', 'Test City', 'TS', 
          'Test Country', '12345', '123-456-7890', 'test@example.com', 
          '09:00', '17:00', NOW(), NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM excel_coworks_schema.branches LIMIT 1
        )
      `);
      
      // Get branch ID
      const [branchResult] = await models.sequelize.query(`
        SELECT id FROM excel_coworks_schema.branches LIMIT 1
      `);
      const branchId = (branchResult[0] as { id: string })?.id;
      
      // Create test seating type if needed
      await models.sequelize.query(`
        INSERT INTO excel_coworks_schema.seating_types (
          id, name, short_code, description, created_at, updated_at
        )
        SELECT 
          gen_random_uuid(), 'Hot Desk', 'HD', 'Flexible workspace', NOW(), NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM excel_coworks_schema.seating_types LIMIT 1
        )
      `);
      
      // Get seating type ID
      const [typeResult] = await models.sequelize.query(`
        SELECT id FROM excel_coworks_schema.seating_types LIMIT 1
      `);
      const typeId = (typeResult[0] as { id: string })?.id;
      
      // Create test seats
      if (branchId && typeId) {
        await models.sequelize.query(`
          INSERT INTO excel_coworks_schema.seats (
            id, branch_id, seating_type_id, name, seat_number, seat_code,
            price, capacity, is_configurable, availability_status, created_at, updated_at
          ) VALUES 
          (
            gen_random_uuid(), '${branchId}', '${typeId}', 'Test Seat 1', 'A1', 'TS-A1',
            25.00, 1, false, 'available', NOW(), NOW()
          ),
          (
            gen_random_uuid(), '${branchId}', '${typeId}', 'Test Seat 2', 'A2', 'TS-A2',
            25.00, 1, false, 'available', NOW(), NOW()
          )
        `);
        console.log('Test seats created successfully');
      }
    }
  } catch (error: any) {
    console.error('Error creating test seats:', error);
  }
}
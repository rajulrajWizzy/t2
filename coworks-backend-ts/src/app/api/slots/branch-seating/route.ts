// Explicitly set Node.js runtime for this route


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { ApiResponse } from '@/types/common';

// Define interfaces for our response structure
interface SlotCategory {
  count: number;
  slots: any[];
}

interface BranchInfo {
  id: number;
  name: string;
  short_code?: string;
  location: string;
  address: string;
}

interface SeatingTypeInfo {
  id: number;
  name: string;
  short_code?: string;
}

interface SlotResponse {
  date: string;
  branch: BranchInfo;
  seating_type: SeatingTypeInfo;
  total_slots: number;
  available: SlotCategory;
  booked: SlotCategory;
  maintenance: SlotCategory;
}

// GET slots by branch and seating type
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Extract query parameters
    const url = new URL(request.url);
    const branch_id = url.searchParams.get('branch_id');
    const branch_code = url.searchParams.get('branch_code');
    const seating_type_id = url.searchParams.get('seating_type_id');
    const seating_type_code = url.searchParams.get('seating_type_code');
    
    // At least one branch identifier is required
    if (!branch_id && !branch_code) {
      return NextResponse.json({
        success: false,
        message: 'Branch ID or branch code is required'
      }, { status: 400 });
    }
    
    // Define branch search condition
    let branchWhere: any = {};
    if (branch_id) {
      // Convert to number and validate
      const branchIdNum = parseInt(branch_id);
      if (isNaN(branchIdNum)) {
        return NextResponse.json({
          success: false,
          message: 'Branch ID must be a valid number'
        }, { status: 400 });
      }
      branchWhere = { id: branchIdNum };
    } else if (branch_code) {
      branchWhere = { short_code: branch_code };
    }
    
    // Define branch attributes to retrieve
    const branchAttributes = ['id', 'name', 'address', 'location', 'short_code'];
    
    // Include latitude and longitude if they exist
    try {
      await models.Branch.findOne({
        attributes: ['latitude', 'longitude'],
        limit: 1
      });
      branchAttributes.push('latitude', 'longitude');
    } catch (error) {
      console.warn('Branch.latitude/longitude columns might not exist, continuing without them');
    }
    
    // Check if short_code exists before including it
    try {
      await models.Branch.findOne({
        attributes: ['short_code'],
        limit: 1
      });
      // If no error, add short_code to attributes
      branchAttributes.push('short_code');
    } catch (error) {
      console.warn('Branch.short_code column does not exist, continuing without it');
    }
    
    // Find the branch
    const branch = await models.Branch.findOne({
      where: branchWhere,
      attributes: branchAttributes
    });
    
    if (!branch) {
      return NextResponse.json({
        success: false,
        message: 'Branch not found'
      }, { status: 404 });
    }
    
    // Find the seating type if specified
    let seatingTypeWhere: any = {};
    if (seating_type_id) {
      const seatingTypeIdNum = parseInt(seating_type_id);
      if (isNaN(seatingTypeIdNum)) {
        const response: ApiResponse = {
          success: false,
          message: 'Seating type ID must be a valid number'
        };
        
        return NextResponse.json(response, { status: 400 });
      }
      seatingTypeWhere = { id: seatingTypeIdNum };
    } else if (seating_type_code) {
      seatingTypeWhere = { short_code: seating_type_code };
    }
    
    // Prepare the query for seating types
    const seatingTypeQuery = {
      attributes: ['id', 'name', 'description', 'hourly_rate', 'is_hourly', 'min_booking_duration', 'min_seats', 'short_code'],
      ...(Object.keys(seatingTypeWhere).length > 0 ? { where: seatingTypeWhere } : {})
    };
    
    // Get all seating types that match the criteria
    const seatingTypes = await models.SeatingType.findAll(seatingTypeQuery);
    
    if (seatingTypes.length === 0 && Object.keys(seatingTypeWhere).length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Seating type not found'
      }, { status: 404 });
    }
    
    // Get seats for this branch filtered by seating type if specified
    const seatsQuery: any = {
      where: { branch_id: branch.id },
      attributes: ['id', 'seat_number', 'seat_code', 'price', 'availability_status'],
      include: [{
        model: models.SeatingType,
        as: 'SeatingType',
        attributes: ['id', 'name', 'short_code']
      }]
    };
    
    // If a specific seating type is requested, filter seats by that type
    if (Object.keys(seatingTypeWhere).length > 0) {
      seatsQuery.include[0].where = seatingTypeWhere;
    }
    
    // Retrieve seats with their seating types
    const seats = await models.Seat.findAll(seatsQuery);
    
    // Group seats by seating type
    const seatingTypeMap = new Map();
    
    // First add all seating types from the query
    seatingTypes.forEach(st => {
      seatingTypeMap.set(st.id, {
        id: st.id,
        name: st.name,
        short_code: st.short_code,
        description: st.description,
        hourly_rate: st.hourly_rate,
        is_hourly: st.is_hourly,
        min_booking_duration: st.min_booking_duration,
        min_seats: st.min_seats,
        seats: [],
        seat_count: 0
      });
    });
    
    // Then add seats to their respective seating types
    seats.forEach(seat => {
      const seatingTypeId = seat.SeatingType.id;
      
      // If this seating type wasn't previously added, add it now
      if (!seatingTypeMap.has(seatingTypeId)) {
        seatingTypeMap.set(seatingTypeId, {
          id: seat.SeatingType.id,
          name: seat.SeatingType.name,
          short_code: seat.SeatingType.short_code,
          seats: [],
          seat_count: 0
        });
      }
      
      // Only include seat ID for dedicated desk types, as specified in requirements
      const seatData = {
        seat_number: seat.seat_number,
        seat_code: seat.seat_code,
        price: seat.price,
        availability_status: seat.availability_status
      };
      
      // Add ID only for dedicated desk as per requirements
      if (seat.SeatingType.name === 'DEDICATED_DESK') {
        (seatData as any).id = seat.id;
      }
      
      seatingTypeMap.get(seatingTypeId).seats.push(seatData);
      seatingTypeMap.get(seatingTypeId).seat_count++;
    });
    
    // Format the response
    const branchWithSeatingTypes = {
      ...branch.toJSON(),
      seating_types: Array.from(seatingTypeMap.values()),
      total_seats: seats.length
    };
    
    // Check for branch images specific to seating type
    try {
      const branchImages = await models.BranchImage.findAll({
        where: { 
          branch_id: branch.id,
          ...(Object.keys(seatingTypeWhere).length > 0 ? { seating_type_id: seatingTypes.map(st => st.id) } : {})
        }
      });
      
      if (branchImages && branchImages.length > 0) {
        // Process images and group by seating type
        const imagesBySeatingType = new Map();
        
        branchImages.forEach(img => {
          if (!imagesBySeatingType.has(img.seating_type_id)) {
            imagesBySeatingType.set(img.seating_type_id, []);
          }
          imagesBySeatingType.get(img.seating_type_id).push(img.image_url);
        });
        
        // Add images to each seating type
        Array.from(seatingTypeMap.values()).forEach(st => {
          const images = imagesBySeatingType.get(st.id) || [];
          st.images = images;
        });
      }
    } catch (error) {
      console.warn('Error fetching branch images:', error);
      // Continue without images if there's an error
    }
    
    return NextResponse.json({
      success: true,
      data: branchWithSeatingTypes
    });
  } catch (error) {
    console.error('Error fetching branch with seating:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch branch with seating',
      error: (error as Error).message
    }, { status: 500 });
  }
} 

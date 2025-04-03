import { SeatingTypeEnum } from '@/types/seating';

/**
 * Fetch seating types and branches in the correct order
 * First fetches seating types, then branches
 * @param token JWT token for authentication
 * @returns Promise with seating types and branches data
 */
export async function fetchSeatingTypesAndBranches(token: string) {
  try {
    // First fetch seating types
    const seatingTypesResponse = await fetchSeatingTypes(token);
    
    // Then fetch branches
    const branchesResponse = await fetchBranches(token);
    
    return {
      seatingTypes: seatingTypesResponse.data,
      branches: branchesResponse.data
    };
  } catch (error) {
    console.error('Error fetching seating types and branches:', error);
    throw error;
  }
}

/**
 * Fetch all seating types
 * @param token JWT token for authentication
 * @returns Promise with seating types data
 */
export async function fetchSeatingTypes(token: string) {
  try {
    const response = await fetch('/api/seating-types', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch seating types: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching seating types:', error);
    throw error;
  }
}

/**
 * Fetch all branches
 * @param token JWT token for authentication
 * @returns Promise with branches data
 */
export async function fetchBranches(token: string) {
  try {
    const response = await fetch('/api/branches', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch branches: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching branches:', error);
    throw error;
  }
}

/**
 * Fetch seats by branch and seating type
 * @param token JWT token for authentication
 * @param branchId Branch ID
 * @param seatingTypeId Seating type ID
 * @returns Promise with seats data
 */
export async function fetchSeatsByBranchAndSeatingType(
  token: string,
  branchId: number,
  seatingTypeId: number
) {
  try {
    const response = await fetch(
      `/api/seat?branch_id=${branchId}&seating_type_id=${seatingTypeId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch seats: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching seats:', error);
    throw error;
  }
}

/**
 * Fetch bookings with branch and seating type short codes
 * @param token JWT token for authentication
 * @param branchCode Branch short code
 * @param seatingTypeCode Seating type short code
 * @returns Promise with bookings data
 */
export async function fetchBookingsByShortCodes(
  token: string,
  branchCode?: string,
  seatingTypeCode?: string
) {
  try {
    let url = '/api/bookings';
    const params = new URLSearchParams();
    
    if (branchCode) {
      params.append('branch', branchCode);
    }
    
    if (seatingTypeCode) {
      params.append('type', seatingTypeCode);
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch bookings: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching bookings:', error);
    throw error;
  }
} 
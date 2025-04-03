import { SeatingTypeEnum } from '@/types/seating';
import { 
  getBranchShortCode, 
  getSeatingTypeShortCode,
  getBranchFromShortCode,
  getSeatingTypeFromShortCode,
  formatApiEndpoint
} from './shortCodes';

/**
 * Example function to generate an API URL for bookings with short codes
 * @param branch Branch name
 * @param seatingType Seating type
 * @returns Formatted API URL with short codes
 */
export function getBookingApiUrl(branch: string, seatingType: SeatingTypeEnum): string {
  const baseEndpoint = '/api/bookings?branch={branch}&type={seatingType}';
  return formatApiEndpoint(baseEndpoint, branch, seatingType);
}

/**
 * Example function to generate an API URL for seats with short codes
 * @param branch Branch name
 * @param seatingType Seating type
 * @returns Formatted API URL with short codes
 */
export function getSeatApiUrl(branch: string, seatingType: SeatingTypeEnum): string {
  const baseEndpoint = '/api/seat?branch={branch}&type={seatingType}';
  return formatApiEndpoint(baseEndpoint, branch, seatingType);
}

/**
 * Example function to parse branch and seating type from URL parameters
 * @param url URL object
 * @returns Object with branch and seatingType
 */
export function parseUrlParams(url: URL): { 
  branchName: string | null; 
  seatingType: SeatingTypeEnum | null;
} {
  const branchCode = url.searchParams.get('branch');
  const seatingTypeCode = url.searchParams.get('type');
  
  let branchName = null;
  let seatingType = null;
  
  if (branchCode) {
    branchName = getBranchFromShortCode(branchCode);
  }
  
  if (seatingTypeCode) {
    seatingType = getSeatingTypeFromShortCode(seatingTypeCode);
  }
  
  return { branchName, seatingType };
}

/**
 * Example function to add short codes to branch data
 * @param branchData Branch data object
 * @returns Branch data with short code
 */
export function addBranchShortCode(branchData: any): any {
  return {
    ...branchData,
    short_code: getBranchShortCode(branchData.name)
  };
}

/**
 * Example function to add short codes to seating type data
 * @param seatingTypeData Seating type data object
 * @returns Seating type data with short code
 */
export function addSeatingTypeShortCode(seatingTypeData: any): any {
  return {
    ...seatingTypeData,
    short_code: getSeatingTypeShortCode(seatingTypeData.name)
  };
} 
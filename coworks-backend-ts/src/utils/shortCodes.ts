import { SeatingTypeEnum } from '@/types/seating';

/**
 * Mapping of branch names to their short codes
 */
export const branchShortCodes: { [key: string]: string } = {
  'naagarbhaavi': 'ngb',
  'outer ring road': 'orr',
  'electronic city': 'ec',
  'whitefield': 'wtf',
  'indiranagar': 'ind',
  'koramangala': 'kor',
  'jayanagar': 'jay',
  'mg road': 'mgr',
  'hsr layout': 'hsr',
  'marathahalli': 'mrt'
};

/**
 * Mapping of seating types to their short codes
 */
export const seatingTypeShortCodes: { [key in SeatingTypeEnum]?: string } = {
  [SeatingTypeEnum.HOT_DESK]: 'hot',
  [SeatingTypeEnum.DEDICATED_DESK]: 'ded',
  [SeatingTypeEnum.CUBICLE]: 'cub',
  [SeatingTypeEnum.MEETING_ROOM]: 'meet',
  [SeatingTypeEnum.DAILY_PASS]: 'day',
};

/**
 * Reverse mapping of short codes to branch names
 */
export const shortCodeToBranch: { [key: string]: string } = 
  Object.entries(branchShortCodes).reduce((acc, [branch, code]) => {
    acc[code] = branch;
    return acc;
  }, {} as { [key: string]: string });

/**
 * Reverse mapping of short codes to seating types
 */
export const shortCodeToSeatingType: { [key: string]: SeatingTypeEnum } = 
  Object.entries(seatingTypeShortCodes).reduce((acc, [seatingType, code]) => {
    if (code) {
      acc[code] = seatingType as SeatingTypeEnum;
    }
    return acc;
  }, {} as { [key: string]: SeatingTypeEnum });

/**
 * Get the short code for a branch
 * @param branch Branch name
 * @returns Short code for the branch, or the original branch name if no mapping exists
 */
export function getBranchShortCode(branch: string): string {
  return branchShortCodes[branch.toLowerCase()] || branch;
}

/**
 * Get the branch name from a short code
 * @param code Branch short code
 * @returns Branch name, or the original code if no mapping exists
 */
export function getBranchFromShortCode(code: string): string {
  return shortCodeToBranch[code.toLowerCase()] || code;
}

/**
 * Get the short code for a seating type
 * @param seatingType Seating type
 * @returns Short code for the seating type, or the original seating type if no mapping exists
 */
export function getSeatingTypeShortCode(seatingType: SeatingTypeEnum): string {
  return seatingTypeShortCodes[seatingType] || seatingType;
}

/**
 * Get the seating type from a short code
 * @param code Seating type short code
 * @returns Seating type, or null if no mapping exists
 */
export function getSeatingTypeFromShortCode(code: string): SeatingTypeEnum | null {
  return shortCodeToSeatingType[code.toLowerCase()] || null;
}

/**
 * Format an API endpoint with short codes
 * @param endpoint Base API endpoint
 * @param branch Branch name
 * @param seatingType Seating type
 * @returns Formatted API endpoint with short codes
 */
export function formatApiEndpoint(
  endpoint: string,
  branch?: string,
  seatingType?: SeatingTypeEnum
): string {
  let formattedEndpoint = endpoint;
  
  if (branch) {
    const branchCode = getBranchShortCode(branch);
    formattedEndpoint = formattedEndpoint.replace('{branch}', branchCode);
  }
  
  if (seatingType) {
    const seatingTypeCode = getSeatingTypeShortCode(seatingType);
    formattedEndpoint = formattedEndpoint.replace('{seatingType}', seatingTypeCode);
  }
  
  return formattedEndpoint;
} 
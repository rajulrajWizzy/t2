/**
 * Common type definitions used across the application
 */

/**
 * Standard API Response format
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error?: string;
  meta?: any;
}

/**
 * JWT Payload structure
 */
export interface JwtPayload {
  id: string | number;
  email: string;
  name: string;
  // Admin-specific fields (optional)
  username?: string;
  role?: string;
  branch_id?: number;
  permissions?: Record<string, string[]>;
  is_admin?: boolean;
  // Standard JWT fields
  iat?: number;
  exp?: number;
}

/**
 * JWT Verification Result
 */
export interface JwtVerificationResult {
  valid: boolean;
  decoded: JwtPayload | null;
  expired: boolean;
  blacklisted: boolean;
  error?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Sort parameters
 */
export interface SortParams {
  field: string;
  direction: 'ASC' | 'DESC';
}

/**
 * Filter parameters
 */
export interface FilterParams {
  field: string;
  value: string | number | boolean | null;
  operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in';
}

/**
 * Query parameters for list endpoints
 */
export interface QueryParams {
  pagination?: PaginationParams;
  sort?: SortParams[];
  filters?: FilterParams[];
  search?: string;
}

// Pagination metadata
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasMore: boolean;
  hasNext: boolean;
  hasPrev: boolean;
}

// Sorting params
export interface SortingParams {
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// Query params
export interface QueryParams extends PaginationParams, SortingParams {
  search?: string;
  [key: string]: any;
}
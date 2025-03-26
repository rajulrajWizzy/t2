// Common response type
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
<<<<<<< Updated upstream
  meta?: {
    pagination?: PaginationMeta;
    [key: string]: any;
  };
=======
}

/**
 * JWT Payload structure
 */
export interface JwtPayload {
  id: string | number;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

/**
 * JWT Verification Result
 */
export interface JwtVerificationResult {
  valid: boolean;
  decoded: JwtPayload | null;
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
>>>>>>> Stashed changes
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

// JWT token payload type
export interface JwtPayload {
  id: number;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

// JWT verification result
export interface JwtVerificationResult {
  valid: boolean;
  expired: boolean;
  decoded: JwtPayload | null;
  blacklisted?: boolean;
}

// Pagination params
export interface PaginationParams {
  page?: number;
  limit?: number;
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
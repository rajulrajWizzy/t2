// Common response type
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  meta?: {
    pagination?: PaginationMeta;
    [key: string]: any;
  };
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
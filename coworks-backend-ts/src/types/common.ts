// Common response type
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: any;
}

// JWT token payload type
import { UserRole } from './auth';

export interface JwtPayload {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  managed_branch_id?: number | null;
  iat?: number;
  exp?: number;
}

// JWT verification result
export interface JwtVerificationResult {
  valid: boolean;
  expired: boolean;
  decoded: JwtPayload | null;
  blacklisted: boolean;
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
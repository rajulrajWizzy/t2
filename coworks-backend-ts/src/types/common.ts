// Common response type
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
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

// Booking metrics
export interface BookingMetrics {
  booking_count: number;
  total_revenue: number;
}

// Dashboard metrics
export interface DashboardMetrics {
  totalBookings: number;
  totalRevenue: number;
  totalCustomers: number;
  totalSeats: number;
  occupiedSeats: number;
  seatBookings: {
    count: number;
    revenue: number;
  };
  meetingBookings: {
    count: number;
    revenue: number;
  };
  seatingTypeMetrics: {
    [key: string]: number;
  };
}

// Dashboard response
export interface DashboardResponse extends ApiResponse<DashboardMetrics> {}
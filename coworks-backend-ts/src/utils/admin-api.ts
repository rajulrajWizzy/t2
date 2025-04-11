import { apiService } from './api-service';

// Define response types for better type safety
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    pagination?: {
      total: number;
      page: number;
      limit: number;
      pages: number;
      hasMore?: boolean;
      hasNext?: boolean;
      hasPrev?: boolean;
    }
  };
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  error?: string;
}

// Define entity types
export interface Admin {
  id: number;
  name: string;
  email: string;
  role: string;
  branch_id?: number;
  permissions?: Record<string, boolean>;
  is_active: boolean;
  last_login?: string;
}

export interface Branch {
  id: number | string;
  name: string;
  address: string;
  location?: string;
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
  image_url?: string;
  total_seats?: number;
  available_seats?: number;
  created_at: string;
  short_code?: string;
}

export interface SeatingType {
  id: number | string;
  name: string;
  short_code: string;
  description?: string;
  hourly_rate?: number;
  daily_rate?: number;
  monthly_rate?: number;
  is_active: boolean;
  image_url?: string;
  created_at: string;
}

export interface Seat {
  id: number | string;
  seat_number: string;
  name?: string;
  seating_type_id: number | string;
  branch_id: number | string;
  is_active: boolean;
  image_url?: string;
  is_available?: boolean;
  SeatingType?: SeatingType;
  Branch?: Branch;
  created_at: string;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone?: string;
  company_name?: string;
  profile_picture?: string;
  proof_of_identity?: string;
  proof_of_address?: string;
  address?: string;
  is_identity_verified: boolean;
  is_address_verified: boolean;
  verification_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  verification_notes?: string;
  verification_date?: string;
  verified_by?: number;
  verified_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: number | string;
  customer_id: number;
  seat_id: number | string;
  branch_id: number | string;
  start_time: string;
  end_time: string;
  status: string;
  total_amount: number;
  payment_status: string;
  Customer?: Customer;
  Seat?: Seat;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  customer_id: number;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  created_at: string;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  refund_id?: string;
  customer_name?: string;
  branch_id?: string | number;
  branch_name?: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalCustomers: number;
  totalBookings: number;
  totalBranches: number;
  activeBookings: number;
  pendingVerifications: number;
}

export interface ChartDataPoint {
  name: string;
  [key: string]: number | string;
}

/**
 * Admin dashboard API services
 * Contains specific methods for each module
 */

// Auth API
export const authApi = {
  login: (email: string, password: string) => apiService.login(email, password),
  logout: () => apiService.logout(),
  verifySession: () => apiService.get<ApiResponse<Admin>>('/admin/verify-session'),
  getProfile: () => apiService.get<ApiResponse<Admin>>('/admin/profile'),
  updateProfile: (data: any) => apiService.put<ApiResponse<Admin>>('/admin/profile', data),
};

// Branches API
export const branchesApi = {
  getAll: (params?: any) => apiService.get<ApiResponse<Branch[]>>('/admin/branches', params),
  getById: (id: string) => apiService.get<ApiResponse<Branch>>(`/admin/branches/${id}`),
  create: (data: any) => apiService.post<ApiResponse<Branch>>('/admin/branches', data),
  update: (id: string, data: any) => apiService.put<ApiResponse<Branch>>(`/admin/branches/${id}`, data),
  delete: (id: string) => apiService.delete<ApiResponse<null>>(`/admin/branches/${id}`),
  uploadImage: (id: string, file: File) => 
    apiService.uploadFile<ApiResponse<{image_url: string}>>(`/admin/branches/${id}/images`, file),
  getStats: (id: string) => apiService.get<ApiResponse<any>>(`/admin/branches/${id}/stats`),
};

// Seating Types API
export const seatingTypesApi = {
  getAll: (params?: any) => apiService.get<ApiResponse<SeatingType[]>>('/admin/seating-types', params),
  getById: (id: string) => apiService.get<ApiResponse<SeatingType>>(`/admin/seating-types/${id}`),
  create: (data: any) => apiService.post<ApiResponse<SeatingType>>('/admin/seating-types', data),
  update: (id: string, data: any) => apiService.put<ApiResponse<SeatingType>>(`/admin/seating-types/${id}`, data),
  delete: (id: string) => apiService.delete<ApiResponse<null>>(`/admin/seating-types/${id}`),
};

// Seats API
export const seatsApi = {
  getAll: (params?: any) => apiService.get<ApiResponse<Seat[]>>('/admin/seats', params),
  getById: (id: string) => apiService.get<ApiResponse<Seat>>(`/admin/seats/${id}`),
  create: (data: any) => apiService.post<ApiResponse<Seat>>('/admin/seats', data),
  update: (id: string, data: any) => apiService.put<ApiResponse<Seat>>(`/admin/seats/${id}`, data),
  delete: (id: string) => apiService.delete<ApiResponse<null>>(`/admin/seats/${id}`),
  getAvailability: (id: string, date: string) => 
    apiService.get<ApiResponse<{is_available: boolean, bookings: Booking[]}>>(`/admin/seats/${id}/availability`, { date }),
  bulkUpload: (branchId: string, file: File) => 
    apiService.uploadFile<ApiResponse<{seats: Seat[], errors: any[]}>>(`/admin/branches/${branchId}/seats/bulk-upload`, file),
};

// Customers API
export const customersApi = {
  getAll: (params?: any) => apiService.get<ApiResponse<Customer[]>>('/admin/customers', params),
  getById: (id: string) => apiService.get<ApiResponse<Customer>>(`/admin/customers/${id}`),
  update: (id: string, data: any) => apiService.put<ApiResponse<Customer>>(`/admin/customers/${id}`, data),
  delete: (id: string) => apiService.delete<ApiResponse<null>>(`/admin/customers/${id}`),
  getBookings: (id: string, params?: any) => 
    apiService.get<ApiResponse<Booking[]>>(`/admin/customers/${id}/bookings`, params),
};

// Verification API
export const verificationApi = {
  getPending: (params?: any) => apiService.get<ApiResponse<Customer[]>>('/admin/customers/verify', { ...params, status: 'PENDING' }),
  getApproved: (params?: any) => apiService.get<ApiResponse<Customer[]>>('/admin/customers/verify', { ...params, status: 'APPROVED' }),
  getRejected: (params?: any) => apiService.get<ApiResponse<Customer[]>>('/admin/customers/verify', { ...params, status: 'REJECTED' }),
  getAll: (params?: any) => apiService.get<ApiResponse<Customer[]>>('/admin/customers/verify', { ...params, status: 'ALL' }),
  updateStatus: (customerId: string, data: any) => 
    apiService.post<ApiResponse<Customer>>('/admin/customers/verify', { customer_id: customerId, ...data }),
  getDocumentUrl: (customerId: string, documentType: 'identity' | 'address') => 
    apiService.get<ApiResponse<{url: string}>>(`/admin/customers/${customerId}/documents/${documentType}`),
};

// Bookings API
export const bookingsApi = {
  getAll: (params?: any) => apiService.get<ApiResponse<Booking[]>>('/admin/bookings', params),
  getById: (id: string) => apiService.get<ApiResponse<Booking>>(`/admin/bookings/${id}`),
  update: (id: string, data: any) => apiService.put<ApiResponse<Booking>>(`/admin/bookings/${id}`, data),
  cancel: (id: string) => apiService.delete<ApiResponse<null>>(`/admin/bookings/${id}`),
};

// Payments API
export const paymentsApi = {
  getAll: (params?: any) => apiService.get<ApiResponse<Payment[]>>('/admin/payments', params),
  getById: (id: string) => apiService.get<ApiResponse<Payment>>(`/admin/payments/${id}`),
  refund: (id: string, data: any) => apiService.post<ApiResponse<{refund_id: string}>>(`/admin/payments/${id}/refund`, data),
};

// Dashboard API
export const dashboardApi = {
  getStats: () => apiService.get<ApiResponse<DashboardStats>>('/admin/dashboard/stats'),
  getRecentBookings: () => apiService.get<ApiResponse<Booking[]>>('/admin/dashboard/recent-bookings'),
  getRecentPayments: () => apiService.get<ApiResponse<Payment[]>>('/admin/dashboard/recent-payments'),
  getOccupancyChart: (params?: any) => apiService.get<ApiResponse<ChartDataPoint[]>>('/admin/dashboard/occupancy', params),
  getRevenueChart: (params?: any) => apiService.get<ApiResponse<ChartDataPoint[]>>('/admin/dashboard/revenue', params),
  getAdminProfile: () => apiService.get<ApiResponse<Admin>>('/admin/profile'),
}; 
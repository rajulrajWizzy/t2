// src/types/auth.ts

// Define all available user roles
export enum UserRole {
  USER = 'user',
  BRANCH_ADMIN = 'branch_admin',
  SUPER_ADMIN = 'super_admin',
  SUPPORT_ADMIN = 'support_admin'
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  password: string;
  profile_picture: string | null;
  company_name: string | null;
  proof_of_identity: string | null;
  proof_of_address: string | null;
  address: string | null;
<<<<<<< Updated upstream
=======
  is_identity_verified: boolean;
  is_address_verified: boolean;
  verification_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  verification_notes: string | null;
  verification_date: Date | null;
  verified_by: number | null;
  coins_balance: number; // Available meeting room coins
  coins_last_reset: Date; // Date when coins were last reset
  role: UserRole; // Add role field for customers
<<<<<<< Updated upstream
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
  created_at: Date;
  updated_at: Date;
}

export interface CustomerInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
  profile_picture?: string;
  company_name?: string;
  proof_of_identity?: string;
  proof_of_address?: string;
  address?: string;
  role?: UserRole;
}

export interface CustomerAttributes extends CustomerInput {
  id?: number;
<<<<<<< Updated upstream
=======
  is_identity_verified?: boolean;
  is_address_verified?: boolean;
  verification_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  verification_notes?: string;
  verification_date?: Date;
  verified_by?: number;
  coins_balance?: number;
  coins_last_reset?: Date;
  role?: UserRole;
<<<<<<< Updated upstream
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
  created_at?: Date;
  updated_at?: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
  role?: UserRole; // Optional role to specify login type
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  customer: Omit<Customer, 'password'>;
  role: UserRole;
}

export interface RegisterRequest {
  name: string;
  email: string;
  phone?: string;
  password: string;
  profile_picture?: string;
  company_name?: string;
  proof_of_identity?: string;
  proof_of_address?: string;
  address?: string;
  role?: UserRole;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  customer: Omit<Customer, 'password'>;
  token: string;
  role: UserRole;
}

// JWT token payload interface
export interface JWTPayload {
  id: number;
  email: string;
  role: UserRole;
  [key: string]: any;
}

// Admin JWT payload interface
export interface AdminJWTPayload extends JWTPayload {
  username: string;
  is_admin: boolean;
  branch_id?: number;
  permissions?: Record<string, string[]>;
}

// Common auth result interface
export interface AuthResult {
  success: boolean;
  token?: string;
  message: string;
  user?: any;
  role?: UserRole;
}
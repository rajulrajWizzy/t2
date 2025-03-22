// src/types/auth.ts
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
  is_identity_verified: boolean;
  is_address_verified: boolean;
  verification_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  verification_notes: string | null;
  verification_date: Date | null;
  verified_by: number | null;
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
}

export interface CustomerAttributes extends CustomerInput {
  id?: number;
  is_identity_verified?: boolean;
  is_address_verified?: boolean;
  verification_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  verification_notes?: string;
  verification_date?: Date;
  verified_by?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  customer: Omit<Customer, 'password'>;
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
}

export interface RegisterResponse {
  message: string;
  customer: Omit<Customer, 'password'>;
  token: string;
}
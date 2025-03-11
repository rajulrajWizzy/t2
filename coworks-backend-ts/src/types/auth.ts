// src/types/auth.ts
export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  password: string;
  reset_token: string | null;
  reset_token_expires: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CustomerInput {
  name: string;
  email: string;
  phone?: string;
  company_name?: string;
  password: string;
}

export interface CustomerAttributes extends CustomerInput {
  id?: number;
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
  company_name?: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  customer: Omit<Customer, 'password'>;
  token: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
  success: boolean;
  reset_token?: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ResetPasswordResponse {
  message: string;
  success: boolean;
}
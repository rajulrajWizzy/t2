// src/types/branch.ts
export interface Branch {
  id: number;
  name: string;
  code: string; // Added code field
  address: string;
  location?: string;
  latitude: number;
  longitude: number;
  cost_multiplier: number;
  opening_time: string;
  closing_time: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  capacity?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface BranchInput {
  name: string;
  code: string; // Added code field
  address: string;
  location?: string;
  latitude: number;
  longitude: number;
  cost_multiplier: number;
  opening_time: string;
  closing_time: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  capacity?: number;
  is_active?: boolean;
}

export interface BranchAttributes extends BranchInput {
  id?: number;
  created_at?: Date;
  updated_at?: Date;
}
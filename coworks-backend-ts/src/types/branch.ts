// src/types/branch.ts
export interface Branch {
  id: number;
  name: string;
  address: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  cost_multiplier: number;
  opening_time: string;
  closing_time: string;
  is_active: boolean;
  images: object | null; // Images for different seating types
  amenities: object | null; // Amenities available in JSON format
  short_code?: string; // Short code for API calls
  created_at: Date;
  updated_at: Date;
}

export interface BranchInput {
  name: string;
  address: string;
  location: string;
  latitude?: number;
  longitude?: number;
  cost_multiplier?: number;
  opening_time?: string;
  closing_time?: string;
  is_active?: boolean;
  images?: object; // Images for different seating types
  amenities?: object; // Amenities available in JSON format
  short_code?: string; // Short code for API calls
}

export interface BranchAttributes extends BranchInput {
  id?: number;
  created_at?: Date;
  updated_at?: Date;
}
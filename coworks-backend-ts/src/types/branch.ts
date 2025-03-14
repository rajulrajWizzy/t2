export interface Branch {
  id: number;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  phone: string;
  email: string;
  capacity: number;
  operating_hours: string;
  is_active: boolean;
  // Optional extended fields
  latitude?: number | null;
  longitude?: number | null;
  cost_multiplier?: number | null;
  images?: string | null;
  amenities?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface BranchInput {
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  phone: string;
  email: string;
  capacity?: number;
  operating_hours?: string;
  is_active?: boolean;
  // Optional extended fields
  latitude?: number | null;
  longitude?: number | null;
  cost_multiplier?: number | null;
  images?: string | null;
  amenities?: string | null;
}

export interface BranchAttributes extends BranchInput {
  id?: number;
  created_at?: Date;
  updated_at?: Date;
}
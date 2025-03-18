// src/types/seating.ts
export enum SeatingTypeEnum {
  HOT_DESK = 'Hot Desk', // Changed from HOT_DESK to 'Hot Desk'
  DEDICATED_DESK = 'Dedicated Desk', // Changed from DEDICATED_DESK to 'Dedicated Desk'
  CUBICLE = 'Cubicle', // Changed from CUBICLE to 'Cubicle'
  MEETING_ROOM = 'Meeting Room', // Changed from MEETING_ROOM to 'Meeting Room'
  DAILY_PASS = 'Daily Pass' // Changed from DAILY_PASS to 'Daily Pass'
}

// Added code words for seating types
export enum SeatingTypeCode {
  HOT_DESK = 'hot',
  DEDICATED_DESK = 'ded',
  CUBICLE = 'cub',
  MEETING_ROOM = 'meet',
  DAILY_PASS = 'day'
}

export enum AvailabilityStatusEnum {
  AVAILABLE = 'AVAILABLE',
  BOOKED = 'BOOKED',
  MAINTENANCE = 'MAINTENANCE'
}

export interface SeatingType {
  id: number;
  name: SeatingTypeEnum;
  code: string; // Added code field
  description: string | null;
  hourly_rate: number;
  is_hourly: boolean;
  min_booking_duration: number;
  min_seats: number; // Added field for minimum seats requirement
  short_code?: string; // Short code for API calls
  min_seats: number;
  created_at: Date;
  updated_at: Date;
}

export interface SeatingTypeInput {
  name: SeatingTypeEnum;
  code: string; // Added code field
  description?: string;
  hourly_rate?: number;
  is_hourly?: boolean;
  min_booking_duration?: number;
  min_seats?: number; // Added field
  short_code?: string; // Short code for API calls
  min_seats?: number;
}

export interface SeatingTypeAttributes extends SeatingTypeInput {
  id?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface Seat {
  id: number;
  branch_id: number;
  seating_type_id: number;
  seat_number: string;
  price: number;
  availability_status: AvailabilityStatusEnum;
  created_at: Date;
  updated_at: Date;
}

export interface SeatInput {
  branch_id: number;
  seating_type_id: number;
  seat_number: string;
  price: number;
  availability_status?: AvailabilityStatusEnum;
}

export interface SeatAttributes extends SeatInput {
  id?: number;
  created_at?: Date;
  updated_at?: Date;
}
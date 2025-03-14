// src/types/seating.ts
export enum SeatingTypeEnum {
  HOT_DESK = 'HOT_DESK',  // Keep the original enum values
  DEDICATED_DESK = 'DEDICATED_DESK',
  CUBICLE = 'CUBICLE',
  MEETING_ROOM = 'MEETING_ROOM',
  DAILY_PASS = 'DAILY_PASS'
}

// Added code words for seating types
export enum SeatingTypeCode {
  HOT_DESK = 'hot',
  DEDICATED_DESK = 'ded',
  CUBICLE = 'cub',
  MEETING_ROOM = 'meet',
  DAILY_PASS = 'day'
}

// Map of display names
export const SeatingTypeDisplayNames = {
  [SeatingTypeEnum.HOT_DESK]: 'Hot Desk',
  [SeatingTypeEnum.DEDICATED_DESK]: 'Dedicated Desk',
  [SeatingTypeEnum.CUBICLE]: 'Cubicle',
  [SeatingTypeEnum.MEETING_ROOM]: 'Meeting Room',
  [SeatingTypeEnum.DAILY_PASS]: 'Daily Pass'
};

export enum AvailabilityStatusEnum {
  AVAILABLE = 'AVAILABLE',
  BOOKED = 'BOOKED',
  MAINTENANCE = 'MAINTENANCE'
}

export interface SeatingType {
  id: number;
  name: SeatingTypeEnum;
  code: string;
  display_name: string; // Added display_name field
  description: string | null;
  hourly_rate: number;
  is_hourly: boolean;
  min_booking_duration: number;
  min_seats: number;
  created_at: Date;
  updated_at: Date;
}

export interface SeatingTypeInput {
  name: SeatingTypeEnum;
  code: string;
  display_name: string; // Added display_name field
  description?: string;
  hourly_rate?: number;
  is_hourly?: boolean;
  min_booking_duration?: number;
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
export enum SeatingTypeEnum {
    HOT_DESK = 'HOT_DESK',
    DEDICATED_DESK = 'DEDICATED_DESK',
    CUBICLE = 'CUBICLE',
    MEETING_ROOM = 'MEETING_ROOM',
    DAILY_PASS = 'DAILY_PASS'
  }
  
  export enum AvailabilityStatusEnum {
    AVAILABLE = 'AVAILABLE',
    BOOKED = 'BOOKED',
    MAINTENANCE = 'MAINTENANCE'
  }
  
  export interface SeatingType {
    id: number;
    name: SeatingTypeEnum;
    description: string | null;
    hourly_rate: number;
    is_hourly: boolean;
    min_booking_duration: number;
    created_at: Date;
    updated_at: Date;
  }
  
  export interface SeatingTypeInput {
    name: SeatingTypeEnum;
    description?: string;
    hourly_rate?: number;
    is_hourly?: boolean;
    min_booking_duration?: number;
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
export enum BookingStatusEnum {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    CANCELLED = 'CANCELLED',
    COMPLETED = 'COMPLETED'
  }
  
  export enum PaymentStatusEnum {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    REFUNDED = 'REFUNDED'
  }
  
  export interface SeatBooking {
    id: number;
    customer_id: number;
    seat_id: number;
    start_time: Date;
    end_time: Date;
    total_amount: number;
    status: BookingStatusEnum;
    payment_id?: string;
    order_id?: string;
    payment_status?: PaymentStatusEnum;
    created_at: Date;
    updated_at: Date;
  }
  
  export interface SeatBookingInput {
    customer_id: number;
    seat_id: number;
    start_time: Date;
    end_time: Date;
    total_amount: number;
    status?: BookingStatusEnum;
    payment_id?: string;
    order_id?: string;
    payment_status?: PaymentStatusEnum;
  }
  
  export interface SeatBookingAttributes extends SeatBookingInput {
    id?: number;
    created_at?: Date;
    updated_at?: Date;
  }
  
  export interface MeetingBooking {
    id: number;
    customer_id: number;
    meeting_room_id: number;
    start_time: Date;
    end_time: Date;
    num_participants: number;
    amenities?: any;
    total_amount: number;
    status: BookingStatusEnum;
    payment_id?: string;
    order_id?: string;
    payment_status?: PaymentStatusEnum;
    created_at: Date;
    updated_at: Date;
  }
  
  export interface MeetingBookingInput {
    customer_id: number;
    meeting_room_id: number;
    start_time: Date;
    end_time: Date;
    num_participants: number;
    amenities?: any;
    total_amount: number;
    status?: BookingStatusEnum;
    payment_id?: string;
    order_id?: string;
    payment_status?: PaymentStatusEnum;
  }
  
  export interface MeetingBookingAttributes extends MeetingBookingInput {
    id?: number;
    created_at?: Date;
    updated_at?: Date;
  }
  
  export interface TimeSlot {
    id: number;
    branch_id: number;
    seat_id: number;
    date: string;
    start_time: string;
    end_time: string;
    is_available: boolean;
    booking_id: number | null;
    created_at: Date;
    updated_at: Date;
  }
  
  export interface TimeSlotInput {
    branch_id: number;
    seat_id: number;
    date: string;
    start_time: string;
    end_time: string;
    is_available?: boolean;
    booking_id?: number | null;
  }
  
  export interface TimeSlotAttributes extends TimeSlotInput {
    id?: number;
    created_at?: Date;
    updated_at?: Date;
  }
  
  export interface TimeSlotGenerationParams {
    branch_id: number;
    date: string;
    regenerate?: boolean;
    seating_type_code?: string;
  }
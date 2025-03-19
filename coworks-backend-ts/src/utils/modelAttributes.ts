/**
 * This file provides safe attribute lists for models to prevent SQL issues
 * with complex nested queries and table aliases
 */

// Safe attributes for Branch model (excludes JSONB fields that can cause issues)
export const BRANCH_SAFE_ATTRIBUTES = [
  'id', 'name', 'address', 'location', 'latitude', 'longitude',
  'cost_multiplier', 'opening_time', 'closing_time', 'is_active',
  'created_at', 'updated_at'
];

// Include JSONB fields and short_code when needed directly (not in nested queries)
export const BRANCH_FULL_ATTRIBUTES = [
  ...BRANCH_SAFE_ATTRIBUTES,
  'images', 'amenities', 'short_code'
];

// Safe attributes for Branch model in nested queries with potential alias issues
export const BRANCH_MINIMAL_ATTRIBUTES = [
  'id', 'name', 'address', 'location'
];

// Safe attributes for Seat model
export const SEAT_ATTRIBUTES = [
  'id', 'branch_id', 'seating_type_id', 'seat_number', 
  'price', 'availability_status', 'created_at', 'updated_at'
];

// Safe attributes for SeatingType model
export const SEATING_TYPE_ATTRIBUTES = [
  'id', 'name', 'description', 'hourly_rate', 'is_hourly',
  'min_booking_duration', 'min_seats', 'short_code', 
  'created_at', 'updated_at'
];

// Safe attributes for Customer model
export const CUSTOMER_ATTRIBUTES = [
  'id', 'name', 'email', 'phone', 'company_name', 
  'created_at', 'updated_at'
];

// Safe attributes for TimeSlot model
export const TIME_SLOT_ATTRIBUTES = [
  'id', 'branch_id', 'seat_id', 'booking_id', 'date',
  'start_time', 'end_time', 'is_available', 'created_at', 'updated_at'
];

// Safe attributes for SeatBooking model
export const SEAT_BOOKING_ATTRIBUTES = [
  'id', 'customer_id', 'seat_id', 'start_time', 'end_time',
  'total_price', 'status', 'created_at', 'updated_at'
];

// Safe attributes for MeetingBooking model
export const MEETING_BOOKING_ATTRIBUTES = [
  'id', 'customer_id', 'meeting_room_id', 'start_time', 'end_time',
  'total_price', 'attendee_count', 'status', 'created_at', 'updated_at'
]; 
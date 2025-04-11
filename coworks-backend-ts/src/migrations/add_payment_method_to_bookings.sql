-- Add payment_method column to meeting_bookings table
ALTER TABLE excel_coworks_schema.meeting_bookings 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'standard';

-- Add payment_method column to seat_bookings table for consistency
ALTER TABLE excel_coworks_schema.seat_bookings 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'standard';

-- Add a comment explaining how to run this migration
COMMENT ON TABLE excel_coworks_schema.meeting_bookings IS 'Table for meeting room bookings. Run this migration using: psql -U postgres -d excel_coworks -f src/migrations/add_payment_method_to_bookings.sql'; 
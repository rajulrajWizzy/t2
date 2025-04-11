-- Migration to add order_id fields to payments and seat_bookings tables
-- Run this migration with:
-- psql -U postgres -d excel_coworks -f src/migrations/add_order_id_to_payments_and_bookings.sql

-- Add order_id field to payments table
ALTER TABLE excel_coworks_schema.payments 
ADD COLUMN order_id VARCHAR(255) NULL;

COMMENT ON COLUMN excel_coworks_schema.payments.order_id IS 'Razorpay order ID for online payments';

-- Add order_id field to seat_bookings table
ALTER TABLE excel_coworks_schema.seat_bookings 
ADD COLUMN order_id VARCHAR(255) NULL;

COMMENT ON COLUMN excel_coworks_schema.seat_bookings.order_id IS 'Razorpay order ID for online payments';

-- Add index on order_id for better performance
CREATE INDEX payments_order_id_idx ON excel_coworks_schema.payments (order_id);
CREATE INDEX seat_bookings_order_id_idx ON excel_coworks_schema.seat_bookings (order_id);

-- Add a payment_method field to the bookings tables for different payment methods
ALTER TABLE excel_coworks_schema.seat_bookings
ADD COLUMN payment_method VARCHAR(20) NOT NULL DEFAULT 'standard';

ALTER TABLE excel_coworks_schema.meeting_bookings
ADD COLUMN payment_method VARCHAR(20) NOT NULL DEFAULT 'standard';

-- Success message
SELECT 'Migration completed successfully: Added order_id fields to payments and bookings tables' as message; 
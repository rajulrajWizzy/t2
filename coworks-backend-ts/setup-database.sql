-- Create the UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS excel_coworks_schema;

-- Create branches table
CREATE TABLE IF NOT EXISTS excel_coworks_schema.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  short_code VARCHAR(50) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  phone VARCHAR(20),
  email VARCHAR(255),
  opening_time TIME WITHOUT TIME ZONE NOT NULL,
  closing_time TIME WITHOUT TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create seating types table
CREATE TABLE IF NOT EXISTS excel_coworks_schema.seating_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  short_code VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create seats table
CREATE TABLE IF NOT EXISTS excel_coworks_schema.seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES excel_coworks_schema.branches(id),
  seating_type_id UUID REFERENCES excel_coworks_schema.seating_types(id),
  name VARCHAR(255) NOT NULL,
  seat_number VARCHAR(50) NOT NULL,
  seat_code VARCHAR(50),
  price DECIMAL(10,2),
  capacity INTEGER DEFAULT 1,
  is_configurable BOOLEAN DEFAULT false,
  availability_status VARCHAR(50) DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS excel_coworks_schema.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_id UUID REFERENCES excel_coworks_schema.seats(id),
  user_id UUID,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  booking_reference VARCHAR(100),
  notes TEXT,
  price DECIMAL(10, 2),
  currency VARCHAR(10) DEFAULT 'USD',
  payment_status VARCHAR(50) DEFAULT 'unpaid',
  checkin_time TIMESTAMP WITH TIME ZONE,
  checkout_time TIMESTAMP WITH TIME ZONE
);

-- Create maintenance blocks table
CREATE TABLE IF NOT EXISTS excel_coworks_schema.maintenance_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_id UUID REFERENCES excel_coworks_schema.seats(id),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  notes TEXT
);

-- Insert sample data for testing
INSERT INTO excel_coworks_schema.branches (
  id, name, short_code, address, city, state, country, postal_code, 
  phone, email, opening_time, closing_time
)
VALUES (
  gen_random_uuid(), 'Digital Ocean HQ', 'DOHQ', '101 Avenue of the Americas', 
  'New York', 'NY', 'USA', '10013', 
  '123-456-7890', 'info@digitalocean.com', 
  '09:00', '18:00'
)
ON CONFLICT DO NOTHING;

INSERT INTO excel_coworks_schema.seating_types (
  id, name, short_code, description
)
VALUES 
(gen_random_uuid(), 'Hot Desk', 'HD', 'Flexible workspace for daily use'),
(gen_random_uuid(), 'Dedicated Desk', 'DD', 'Fixed desk for regular use'),
(gen_random_uuid(), 'Private Office', 'PO', 'Enclosed office space')
ON CONFLICT DO NOTHING;

-- Get branch ID and seating type IDs
DO $$
DECLARE
    branch_id UUID;
    hotdesk_id UUID;
    dedicated_id UUID;
    private_id UUID;
BEGIN
    SELECT id INTO branch_id FROM excel_coworks_schema.branches LIMIT 1;
    SELECT id INTO hotdesk_id FROM excel_coworks_schema.seating_types WHERE short_code = 'HD' LIMIT 1;
    SELECT id INTO dedicated_id FROM excel_coworks_schema.seating_types WHERE short_code = 'DD' LIMIT 1;
    SELECT id INTO private_id FROM excel_coworks_schema.seating_types WHERE short_code = 'PO' LIMIT 1;

    -- Insert sample seats
    INSERT INTO excel_coworks_schema.seats (
      branch_id, seating_type_id, name, seat_number, seat_code,
      price, capacity, is_configurable, availability_status
    )
    VALUES 
    (branch_id, hotdesk_id, 'Hot Desk 1', 'HD1', 'DOHQ-HD1', 25.00, 1, false, 'available'),
    (branch_id, hotdesk_id, 'Hot Desk 2', 'HD2', 'DOHQ-HD2', 25.00, 1, false, 'available'),
    (branch_id, dedicated_id, 'Dedicated Desk 1', 'DD1', 'DOHQ-DD1', 45.00, 1, false, 'available'),
    (branch_id, private_id, 'Private Office 1', 'PO1', 'DOHQ-PO1', 85.00, 4, true, 'available')
    ON CONFLICT DO NOTHING;
END $$; 
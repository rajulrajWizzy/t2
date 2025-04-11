-- Migration to create the maintenance_blocks table
-- Run this migration with:
-- psql -U postgres -d excel_coworks -f src/migrations/create_maintenance_blocks_table.sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create maintenance_blocks table
CREATE TABLE IF NOT EXISTS maintenance_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seat_id INTEGER NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  reason VARCHAR(255),
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (seat_id) REFERENCES seats(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_maintenance_blocks_seat_id ON maintenance_blocks(seat_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_blocks_start_time ON maintenance_blocks(start_time);
CREATE INDEX IF NOT EXISTS idx_maintenance_blocks_end_time ON maintenance_blocks(end_time);
CREATE INDEX IF NOT EXISTS idx_maintenance_blocks_created_by ON maintenance_blocks(created_by);

-- Comment on table
COMMENT ON TABLE maintenance_blocks IS 'Stores maintenance periods for seats when they are unavailable';

-- Success message
SELECT 'Maintenance blocks table created successfully' as message; 
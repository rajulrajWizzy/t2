-- Complete SQL script to create meeting room test data
-- This script can be run in pgAdmin or any SQL client connected to the coworks database

-- Step 1: Clear existing test data
DELETE FROM excel_coworks_schema.seats WHERE branch_id IN (
  SELECT id FROM excel_coworks_schema.branches 
  WHERE short_code IN ('MRB')
);

DELETE FROM excel_coworks_schema.branches 
WHERE short_code IN ('MRB');

-- Step 2: Insert or update the meeting room seating type
INSERT INTO excel_coworks_schema.seating_types 
(name, description, hourly_rate, daily_rate, weekly_rate, monthly_rate, capacity, is_meeting_room, is_active, short_code, is_hourly, min_booking_duration, min_seats)
VALUES
('Meeting Room', 'Conference room for meetings', 300.00, 1500.00, 9000.00, 30000.00, 10, true, true, 'MR', true, 1, 2)
ON CONFLICT (short_code) 
DO UPDATE SET 
  name = 'Meeting Room',
  description = 'Conference room for meetings', 
  hourly_rate = 300.00,
  daily_rate = 1500.00,
  weekly_rate = 9000.00,
  monthly_rate = 30000.00,
  capacity = 10,
  is_meeting_room = true,
  is_active = true,
  is_hourly = true,
  min_booking_duration = 1,
  min_seats = 2;

-- Step 3: Create a branch for MR test
INSERT INTO excel_coworks_schema.branches
(name, address, location, latitude, longitude, cost_multiplier, opening_time, closing_time, is_active, short_code)
VALUES
('Meeting Room Branch', '100 Meeting St', 'Downtown', 40.7128, -74.0060, 1.0, '08:00:00', '20:00:00', true, 'MRB')
RETURNING id;

-- Step 4: Create seats for the branch
-- Note: Run this after noting the branch ID from the previous step and replace {branch_id} with the actual ID
WITH branch_id AS (
  SELECT id FROM excel_coworks_schema.branches WHERE short_code = 'MRB'
),
seating_type_id AS (
  SELECT id FROM excel_coworks_schema.seating_types WHERE short_code = 'MR'
)
INSERT INTO excel_coworks_schema.seats
(branch_id, seating_type_id, seat_number, price, capacity, is_configurable, availability_status, seat_code)
SELECT 
  branch_id.id, 
  seating_type_id.id, 
  'MR-00' || i, 
  300.00, 
  (i * 4 + 4)::integer, 
  true, 
  'available', 
  'MR-MRB-00' || i
FROM 
  branch_id, 
  seating_type_id, 
  generate_series(1, 3) AS i;

-- Step 5: Verify the data
SELECT 
    b.id AS branch_id, 
    b.name AS branch_name, 
    b.short_code,
    s.id AS seat_id,
    s.seat_number,
    s.seat_code,
    st.id AS seating_type_id,
    st.name AS seating_type_name,
    st.short_code AS seating_type_code
FROM 
    excel_coworks_schema.branches b
JOIN 
    excel_coworks_schema.seats s ON b.id = s.branch_id
JOIN 
    excel_coworks_schema.seating_types st ON s.seating_type_id = st.id
WHERE 
    st.short_code = 'MR'; 
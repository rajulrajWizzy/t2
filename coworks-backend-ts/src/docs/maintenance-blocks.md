# Maintenance Blocks Feature

This feature allows admins to block seats for maintenance, preventing them from being booked during maintenance periods.

## Database Schema

The `maintenance_blocks` table stores scheduled maintenance blocks for seats:

```sql
CREATE TABLE IF NOT EXISTS maintenance_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID,
  notes TEXT,
  CHECK (end_time > start_time)
);
```

## API Endpoints

### Admin Endpoints

1. **Create Maintenance Block**
   - Endpoint: `POST /api/admin/availability/block`
   - Description: Creates a new maintenance block for a seat
   - Request Body:
     ```json
     {
       "seat_id": "uuid",
       "start_time": "2023-12-01T08:00:00Z",
       "end_time": "2023-12-01T12:00:00Z",
       "reason": "Monthly cleaning",
       "notes": "Optional notes about the maintenance"
     }
     ```
   - Authorization: Admin token required

2. **List Maintenance Blocks**
   - Endpoint: `GET /api/admin/availability/blocks?seat_id=uuid&start_date=2023-12-01&end_date=2023-12-31`
   - Description: Lists all maintenance blocks, with optional filtering
   - Query Parameters:
     - `seat_id`: Filter by seat ID (optional)
     - `start_date`: Filter by start date (optional)
     - `end_date`: Filter by end date (optional)
   - Authorization: Admin token required

3. **Delete Maintenance Block**
   - Endpoint: `DELETE /api/admin/availability/blocks/[id]`
   - Description: Deletes a maintenance block
   - Path Parameters:
     - `id`: UUID of the maintenance block
   - Authorization: Admin token required

### Public Endpoints

1. **Get Seat Availability**
   - Endpoint: `GET /api/availability?seat_id=uuid&start_date=2023-12-01&end_date=2023-12-31`
   - Description: Gets availability for a specific seat, including maintenance blocks
   - Query Parameters:
     - `seat_id`: UUID of the seat
     - `start_date`: Start date for availability check
     - `end_date`: End date for availability check
   - Response: Includes maintenance blocks in the response and accounts for them in the availability calculation

2. **Get Branch Availability**
   - Endpoint: `GET /api/availability?branch_id=14&start_date=2023-12-01&end_date=2023-12-31`
   - Description: Gets availability for all seats in a branch, including maintenance blocks
   - Query Parameters:
     - `branch_id`: ID of the branch
     - `start_date`: Start date for availability check
     - `end_date`: End date for availability check
     - `seating_type_id`: Optional filter for seating type
     - `seating_type_code`: Optional filter for seating type code
   - Response: Includes maintenance blocks in the response and accounts for them in the availability calculation

## Code Implementation

1. `MaintenanceBlock` model added to Sequelize models
2. Admin API endpoints for CRUD operations
3. Integration with availability API to check for maintenance blocks

## Database Migration

Run the following command to create the maintenance_blocks table:

```bash
psql -U postgres -d excel_coworks -f src/migrations/create_maintenance_blocks_table.sql
```

## Example Usage

### Creating a Maintenance Block

```bash
curl -X POST \
  https://api.example.com/api/admin/availability/block \
  -H 'Authorization: Bearer <admin_token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "seat_id": "uuid-of-seat",
    "start_time": "2023-12-01T08:00:00Z",
    "end_time": "2023-12-01T12:00:00Z",
    "reason": "Monthly cleaning"
  }'
```

### Checking Availability

```bash
curl -X GET \
  'https://api.example.com/api/availability?seat_id=uuid-of-seat&start_date=2023-12-01&end_date=2023-12-31'
```

The response will include maintenance blocks and they will be taken into account when determining if a time slot is available. 
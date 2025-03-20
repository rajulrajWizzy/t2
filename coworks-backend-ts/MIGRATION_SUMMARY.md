# Branch & Seat Code Migration Summary

This document outlines the changes made to implement branch and seat codes in the API, allowing for more user-friendly identifiers throughout the system.

## Overview of Changes

1. **Model Updates**:
   - Added `short_code` field to the Branch model
   - Added `short_code` field to the SeatingType model
   - Added `seat_code` field to the Seat model
   - Implemented automatic generation of these codes when records are created

2. **API Endpoint Updates**:
   - Updated branch endpoints to support lookup by branch code
   - Updated seat endpoints to support lookup by seat code
   - Added new endpoints to get seats by branch code
   - Enhanced response formats to include seat counts and organize by seating type

3. **Database Migrations**:
   - Added migration scripts for adding all necessary columns

## Migration Steps

To apply these changes to your environment, follow these steps:

1. **Run Database Migrations**:
   ```
   npm run migrate:branch-short-code
   npm run migrate:branch-images
   npm run migrate:branch-amenities
   npm run migrate:seat-code
   ```

2. **Test Endpoints**:
   - Test the `/api/branches` endpoint to confirm branches now include short codes
   - Test the `/api/branches/[code]` endpoint to confirm branches can be looked up by code
   - Test the `/api/branches/[code]/seats` endpoint to confirm seats are organized by seating type

## Key API Changes

### Branch Endpoints

- **GET /api/branches**
  - Now returns branches with `short_code`
  - Seats are organized by seating type
  - Includes total seat count and per-seating-type counts
  - Supports filtering by `seating_type_code` (in addition to `seating_type_id`)

- **GET /api/branches/[id]**
  - Now accepts either branch ID or branch code
  - Returns branch with `short_code` and total seat count

- **GET /api/branches/[id]/seats**
  - Access seats for a branch using either ID or branch code
  - Filter by `seating_type_id` or `seating_type_code`
  - Seats are organized by seating type

### Seat Endpoints

- **GET /api/seat/[id]**
  - Now accepts either seat ID or seat code
  - Returns seat with branch and seating type information

## Response Format Examples

### Branch with Seats Example:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Downtown Branch",
    "address": "123 Main St",
    "location": "Downtown",
    "short_code": "DOW123",
    "seating_types": [
      {
        "id": 1,
        "name": "Hot Desk",
        "short_code": "HD",
        "description": "Flexible seating",
        "hourly_rate": 10,
        "is_hourly": true,
        "min_booking_duration": 1,
        "min_seats": 1,
        "seats": [
          {
            "id": 1,
            "seat_code": "HD001",
            "seat_number": "A1",
            "price": 10,
            "availability_status": "available"
          }
        ],
        "seat_count": 1
      }
    ],
    "total_seats": 1
  }
}
```

### Seat Response Example:

```json
{
  "success": true,
  "data": {
    "seat": {
      "id": 1,
      "branch_id": 1,
      "seating_type_id": 1,
      "seat_number": "A1",
      "seat_code": "HD001",
      "price": 10,
      "availability_status": "available",
      "Branch": {
        "id": 1,
        "name": "Downtown Branch",
        "short_code": "DOW123"
      },
      "SeatingType": {
        "id": 1,
        "name": "Hot Desk",
        "short_code": "HD"
      }
    },
    "bookings": []
  }
}
```

## Troubleshooting

If you encounter any issues:

1. Verify all migrations ran successfully
2. Check that your environment has the necessary database schema
3. Ensure branch and seating type records have valid short codes
4. For any records missing codes, you can run the migration scripts again

For additional assistance, refer to the codebase documentation or contact the development team. 
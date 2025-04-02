# Database Model Fixes

This document outlines the database model fixes implemented to resolve various errors with missing columns.

## Issue Description

The application was encountering several database-related errors due to missing columns in tables:

1. `column SeatModel.price does not exist`
2. `column SeatingType.is_hourly does not exist`
3. `column "is_hourly" does not exist`

These errors occurred because:
- The model definitions in the code referred to columns that did not exist in the actual database schema
- Database migrations were not properly synchronized with the current model definitions
- Some columns were added to the models but not to the database tables

## Solution

A comprehensive migration script (`022_add_missing_seat_and_seatingtype_columns.js`) was created to address these issues by:

1. Adding missing columns to the `seats` table:
   - `price` (DECIMAL)
   - `is_configurable` (BOOLEAN)
   - `availability_status` (VARCHAR)

2. Adding missing columns to the `seating_types` table:
   - `is_hourly` (BOOLEAN)
   - `min_booking_duration` (INTEGER)
   - `min_seats` (INTEGER)
   - `capacity_options` (JSON)
   - `quantity_options` (JSON)
   - `cost_multiplier` (DECIMAL)

3. Setting default values for the new columns to ensure backward compatibility

## Database Schema Fixes History

The following migrations have been applied to fix database schema issues:

| Migration | Purpose |
|-----------|---------|
| `020_add_seat_code_column.js` | Adds missing `seat_code` column to seats table |
| `021_add_short_code_to_seating_types.js` | Adds missing `short_code` column to seating_types table |
| `022_add_missing_seat_and_seatingtype_columns.js` | Adds multiple missing columns to both tables |

## How to Apply the Fix

To apply all database fixes:

```bash
npm run fix-db-columns
```

This command runs all migrations in sequence, ensuring the database schema matches the model definitions in the code.

## Verification

After running the migrations, the API endpoints should work correctly without any missing column errors. The following endpoints were tested and confirmed working:

- `GET /api/branches` - Returns list of branches (previously failing with `column SeatModel.price does not exist`)
- `GET /api/branches/1` - Returns details of a specific branch (previously failing with `column SeatingType.is_hourly does not exist`)
- `GET /api/seating-types` - Returns list of seating types (previously failing with `column "is_hourly" does not exist`)

## Prevention Measures

To prevent similar issues in the future:

1. Always create a migration when adding new columns to models
2. Use migration scripts to modify the database schema instead of manual SQL
3. Keep model definitions and database schema in sync
4. Consider using an ORM feature like Sequelize's `sync()` in development (but not in production)
5. Document database schema changes thoroughly
6. Test API endpoints after making database schema changes 
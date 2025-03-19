# Fix for "column p.short_code does not exist" Error

This document explains the fix for the Sequelize error `column p.short_code does not exist` that was occurring in several API endpoints after we fixed the previous `p.images` error.

## Root Cause

The error was occurring for similar reasons as the `p.images` error:

1. The `short_code` column was included in the `BRANCH_SAFE_ATTRIBUTES` list in our previous fix
2. In complex nested queries with table aliases, Sequelize was generating SQL with ambiguous references to "p.short_code"
3. When the SQL was executed against the database, it would fail because the alias was not properly scoped

## Implemented Fixes

1. We updated the `src/utils/modelAttributes.ts` file to create three distinct attribute sets for Branch models:
   - `BRANCH_MINIMAL_ATTRIBUTES`: A minimal set of attributes (id, name, address, location) for deeply nested queries
   - `BRANCH_SAFE_ATTRIBUTES`: A larger set that excludes JSONB fields and short_code
   - `BRANCH_FULL_ATTRIBUTES`: The complete set of attributes for direct Branch queries

2. Modified the following files to use the appropriate attribute sets:
   - `src/app/api/branches/route.ts`
   - `src/app/api/bookings/[id]/route.ts`
   - `src/app/api/bookings/route.ts`

3. In the branches API, we refactored the query approach to use a two-step process:
   - First find branches that have the specified seating type
   - Then fetch complete branch data using the branch IDs

## Best Practices Going Forward

When working with nested Sequelize queries:

1. Use the most restrictive attribute set possible for nested models:
   - `BRANCH_MINIMAL_ATTRIBUTES` for deeply nested Branch queries
   - `BRANCH_SAFE_ATTRIBUTES` for first-level Branch queries 
   - `BRANCH_FULL_ATTRIBUTES` for direct Branch queries

2. For complex filtering operations, consider using a two-step approach:
   - First query to get IDs that match the filter
   - Second query to fetch complete records using the IDs

3. Pay special attention to columns that might be added to models in the future - they'll need to be added to the appropriate attribute sets.

## Additional Notes

This fix builds on our previous fix for the `p.images` error, further refining our approach to handling complex Sequelize queries with nested joins and table aliases. 
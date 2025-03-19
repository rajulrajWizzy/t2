# Fix for "column p.images does not exist" Error

This document explains the fix for the Sequelize error `column p.images does not exist` that was occurring in several API endpoints, particularly those with complex nested queries involving the Branch model.

## Root Cause

The error was occurring because:

1. When Sequelize generates SQL for complex nested queries with multiple models, it creates aliases for tables.
2. In particular, the branches table was being aliased as "p" in a subquery.
3. In the outer query, when it tried to reference "p.images" (where images is a JSONB column), the SQL error occurred because the alias was not properly scoped.

## Implemented Fixes

1. We created a utility file `src/utils/modelAttributes.ts` that defines safe attribute lists for each model. This ensures that column references are consistent and avoids referencing problematic columns (like JSONB fields) in nested queries.

2. Modified the following files to use explicit attribute lists:
   - `src/app/api/branches/[id]/route.ts`
   - `src/app/api/branches/route.ts`
   - `src/app/api/bookings/[id]/route.ts`
   - `src/app/api/bookings/route.ts`

3. For the Branch model in particular, we provided two attribute sets:
   - `BRANCH_SAFE_ATTRIBUTES`: Excludes JSONB fields (images, amenities) to use in nested queries
   - `BRANCH_FULL_ATTRIBUTES`: Includes all fields, to use when directly querying the Branch model

## Best Practices Going Forward

When working with complex nested Sequelize queries:

1. Always use explicit attribute lists for each model in the query.
2. Use the new utility constants from `src/utils/modelAttributes.ts` to ensure consistent attribute selection.
3. Avoid including JSONB fields in attributes when doing deeply nested queries.
4. If you need to add new columns to models, add them to the appropriate attribute list in the utilities file.

## Additional Notes

This fix was implemented without requiring any database schema changes. The issue was purely in the way Sequelize was constructing SQL queries, not in the underlying data model. 
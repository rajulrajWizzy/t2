# Fix for "column p.images does not exist" Error

This document provides instructions for fixing the error `column p.images does not exist` that appears when accessing the branches API.

## Understanding the Issue

The error occurs because there's a mismatch between how the `images` column is being referenced in SQL queries and how it actually exists in the database schema. This could be due to:

1. The `images` column not existing in the branches table
2. A view or function incorrectly referencing the column with an alias `p`
3. A migration not properly applied

## Fix Solution

We've created a migration script that performs the following actions:

1. Checks if the `images` column exists in the branches table and adds it if needed
2. Identifies any database views that incorrectly reference `p.images` and updates them 
3. Performs a test to ensure the column is properly accessible
4. Fixes any incorrect references by replacing them with proper column access

Additionally, we've updated the Branches API to use direct attribute access rather than relying on aliases that might be causing issues.

## Running the Migration

Follow these steps to apply the fix:

1. Make sure your environment variables are properly set up in your `.env` file.

2. Run the migration script:

```bash
node scripts/fix-branch-images.js
```

3. You should see output indicating:
   - Database connection successful
   - Whether the images column exists and was added if needed
   - Any views that were fixed
   - Confirmation that the migration completed successfully

4. After running the migration, test the API to confirm the error is resolved:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/branches?page=1&limit=50&seating_type_id=1
```

## Verifying the Fix

To verify the fix was successful:

1. The API endpoint should return a valid response without the error message
2. The response should include branches with their `images` field correctly populated
3. You should be able to filter by seating type without encountering the error

## Additional Notes

If you continue to see the error after applying this fix, please check:

1. Database permissions - ensure your database user has the necessary privileges
2. Database schema - confirm you're using the correct schema in your configuration
3. PostgreSQL version - make sure your database version supports JSONB columns
4. Any other custom SQL queries in your application that might be referencing `p.images`

For any further issues, please open a ticket with the error details and the output from running the migration script. 
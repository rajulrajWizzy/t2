# Short Code Migration Documentation

## Overview

This document outlines the changes made to implement short codes for branches and seating types in the CoWorks backend system. Short codes provide a more concise and user-friendly way to reference branches and seating types in API calls and URLs.

## Changes Made

### Model Updates

1. **Branch Model (`src/models/branch.ts`)**
   - Added `short_code` field (STRING(10), unique, nullable)
   - Updated `BranchCreationAttributes` interface to include `short_code`
   - Changed `images` and `amenities` fields to use `JSONB` instead of `JSON`

2. **Seating Type Model (`src/models/seatingType.ts`)**
   - Added `short_code` field (STRING(10), unique, nullable)
   - Updated `SeatingTypeCreationAttributes` interface to include `short_code`

### API Route Updates

1. **Branches API (`src/app/api/branches/route.ts`)**
   - Removed manual addition of short codes to the response
   - Updated POST method to include `short_code` in request body parsing

2. **Seating Types API (`src/app/api/seating-types/route.ts`)**
   - Removed manual addition of short codes to the response
   - Updated POST method to include `short_code` in request body parsing

3. **Bookings API (`src/app/api/bookings/route.ts`)**
   - Updated GET method to filter by branch and seating type using database short codes
   - Removed utility functions for manually adding short codes

### Migration Scripts

1. **Database Migration Script (`migrate.js`)**
   - Created a script to run database migrations for adding the new `short_code` fields

2. **Short Code Population Script (`populate-short-codes.js`)**
   - Created a script to populate short codes for existing branches and seating types
   - Includes predefined mappings for common branch names and seating types
   - Generates fallback short codes based on the first three characters of the name

## How to Run the Migration

1. **Run Database Migrations**
   ```bash
   node migrate.js
   ```

2. **Populate Short Codes for Existing Data**
   ```bash
   node populate-short-codes.js
   ```

## Using Short Codes in API Calls

### Examples

1. **Get Branches by Short Code**
   ```
   GET /api/branches?code=ngb
   ```

2. **Get Seating Types by Short Code**
   ```
   GET /api/seating-types?code=hot
   ```

3. **Filter Bookings by Branch and Seating Type**
   ```
   GET /api/bookings?branch=ngb&type=hot
   ```

## Short Code Conventions

- Branch short codes are typically 3 characters derived from the branch name
- Seating type short codes follow these conventions:
  - HOT_DESK: "hot"
  - DEDICATED_DESK: "ded"
  - CUBICLE: "cub"
  - MEETING_ROOM: "meet"
  - DAILY_PASS: "day" 
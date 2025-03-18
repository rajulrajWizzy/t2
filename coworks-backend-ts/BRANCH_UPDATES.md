# Branch and Short Code Updates

## Overview

This document outlines the changes made to implement consistent branch naming and short codes in the CoWorks backend system.

## Changes Made

### 1. Fixed Branch Naming

- Corrected the spelling of "Naagarbhaavi" to "Nagarabhavi" throughout the codebase
- Updated all references to ensure consistent naming

### 2. Added Short Codes for Branches

Added the following short codes for branches:

| Branch Name | Short Code |
|-------------|------------|
| Nagarabhavi | ngb        |
| Outer Ringroad | orr      |
| Kengeri Ring Road | krr   |
| Papareddypalya | prp      |

### 3. Updated Seeder Files

- Updated `src/utils/seeders/branches.ts` to include short codes for each branch
- Updated `src/utils/seeders/seatingTypes.ts` to include short codes and min_seats for each seating type

### 4. Created Migration Script

- Enhanced `populate-short-codes.js` to:
  - Add short codes for all branches
  - Fix the spelling of "Naagarbhaavi" to "Nagarabhavi"
  - Ensure all seating types have appropriate short codes

### 5. Updated Postman Collection

- Created a comprehensive Postman collection with updated branch names and short codes
- Added examples for accessing branches and seating types by their short codes

## How to Apply These Changes

1. **Run the Database Migrations**
   ```bash
   node migrate.js
   ```

2. **Populate Short Codes for Existing Data**
   ```bash
   node populate-short-codes.js
   ```

3. **Reseed the Database (Optional)**
   ```bash
   # To reseed branches with correct names and short codes
   ts-node src/utils/seeders/branches.ts
   
   # To reseed seating types with short codes
   ts-node src/utils/seeders/seatingTypes.ts
   ```

4. **Import Postman Collection**
   - Import the `postman_collection.json` file into Postman for testing

## Using Short Codes in API Calls

### Examples

1. **Get Branch by Short Code**
   ```
   GET /api/branches?code=ngb  # Get Nagarabhavi branch
   GET /api/branches?code=orr  # Get Outer Ringroad branch
   ```

2. **Get Bookings by Branch Short Code**
   ```
   GET /api/bookings?branch=ngb  # Get bookings for Nagarabhavi branch
   ```

3. **Get Bookings by Seating Type Short Code**
   ```
   GET /api/bookings?type=hot  # Get bookings for Hot Desk seating type
   ``` 
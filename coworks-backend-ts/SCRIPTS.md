# Scripts Documentation

This document provides an overview of all scripts in the project, categorized by their purpose.

Table of Contents:
- [Utility Scripts](#utility-scripts)

## Utility Scripts

Helper scripts for various tasks like creating directories, testing, etc.

| Script | Description | Size | Last Modified |
|--------|-------------|------|---------------|
| create-migration.js | * Migration Script Generator This utility script helps create new migration files with proper naming conventions and boilerplate code structure. Usage: node scripts/create-migration.js "description-of-migration" Example: node scripts/create-migration.js "add-user-preferences" / Color codes for console output | 3.8 KB | 2025-03-26 |
| create-seed.js | * Seed Script Generator This utility script helps create new seed files with proper naming conventions and boilerplate code structure. Usage: node scripts/create-seed.js "description-of-seed" Example: node scripts/create-seed.js "seed-admin-users" / Color codes for console output | 7.1 KB | 2025-03-26 |
| create-uploads-dir.js | * Uploads Directory Creator This utility script creates the required directories for file uploads in the project. It ensures all necessary subdirectories exist. Usage: node scripts/create-uploads-dir.js or npm run create-uploads-dir / Color codes for console output | 2.3 KB | 2025-03-26 |


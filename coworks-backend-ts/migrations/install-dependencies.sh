#!/bin/bash

# Script to install necessary dependencies for running the database migration

echo "Installing dependencies required for database migration..."
npm install --save sequelize pg pg-hstore

echo "Dependencies installed successfully!"
echo "You can now run the migration script with: node migrations/run-migration.js" 
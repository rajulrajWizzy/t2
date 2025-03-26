export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Import middleware bypass configuration
import { bypassMiddleware } from '../auth/middleware-bypass';

// Apply middleware bypass configuration
export const config = bypassMiddleware;

import { NextRequest, NextResponse } from 'next/server';
import sequelize from '@/config/database';

// This is a one-time fix route that should be removed after use
export async function POST(request: NextRequest): Promise<NextResponse> {
  return await fixCustomersTable();
}

// Adding GET method for easier access via browser
export async function GET(): Promise<NextResponse> {
  return await fixCustomersTable();  
}

// Function to fix the customers table structure
async function fixCustomersTable(): Promise<NextResponse> {
  try {
    console.log('Starting customers table fix process...');

    const dbSchema = process.env.DB_SCHEMA || 'public';
    console.log(`Using DB schema: ${dbSchema}`);
    
    // Check if customers table exists
    const [tableCheckResults] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '${dbSchema}'
        AND table_name = 'customers'
      ) as "exists";
    `);
    
    // Properly check if table exists with type safety
    const tableExists = Array.isArray(tableCheckResults) && 
                       tableCheckResults.length > 0 && 
                       tableCheckResults[0] && 
                       (tableCheckResults[0] as Record<string, unknown>)["exists"] === true;
    
    if (!tableExists) {
      console.log('Customers table does not exist, cannot fix');
      return NextResponse.json({ 
        success: false, 
        message: 'Customers table does not exist' 
      }, { status: 404 });
    }
    
    console.log('Checking for missing columns...');
    
    // Check if proof_of_identity column exists
    const [identityColumnCheckResults] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = '${dbSchema}'
        AND table_name = 'customers'
        AND column_name = 'proof_of_identity'
      ) as "exists";
    `);
    
    const identityColumnExists = Array.isArray(identityColumnCheckResults) && 
                               identityColumnCheckResults.length > 0 && 
                               identityColumnCheckResults[0] && 
                               (identityColumnCheckResults[0] as Record<string, unknown>)["exists"] === true;
    
    if (!identityColumnExists) {
      console.log('Adding proof_of_identity column...');
      await sequelize.query(`
        ALTER TABLE "${dbSchema}"."customers"
        ADD COLUMN proof_of_identity VARCHAR(255);
      `);
    }
    
    // Check if proof_of_address column exists
    const [addressColumnCheckResults] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = '${dbSchema}'
        AND table_name = 'customers'
        AND column_name = 'proof_of_address'
      ) as "exists";
    `);
    
    const addressColumnExists = Array.isArray(addressColumnCheckResults) && 
                              addressColumnCheckResults.length > 0 && 
                              addressColumnCheckResults[0] && 
                              (addressColumnCheckResults[0] as Record<string, unknown>)["exists"] === true;
    
    if (!addressColumnExists) {
      console.log('Adding proof_of_address column...');
      await sequelize.query(`
        ALTER TABLE "${dbSchema}"."customers"
        ADD COLUMN proof_of_address VARCHAR(255);
      `);
    }
    
    // Check if address column exists
    const [fullAddressColumnCheckResults] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = '${dbSchema}'
        AND table_name = 'customers'
        AND column_name = 'address'
      ) as "exists";
    `);
    
    const fullAddressColumnExists = Array.isArray(fullAddressColumnCheckResults) && 
                                  fullAddressColumnCheckResults.length > 0 && 
                                  fullAddressColumnCheckResults[0] && 
                                  (fullAddressColumnCheckResults[0] as Record<string, unknown>)["exists"] === true;
    
    if (!fullAddressColumnExists) {
      console.log('Adding address column...');
      await sequelize.query(`
        ALTER TABLE "${dbSchema}"."customers"
        ADD COLUMN address TEXT;
      `);
    }
    
    // Record the migration
    const [migrationsTableCheckResults] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '${dbSchema}'
        AND table_name = 'migrations'
      ) as "exists";
    `);
    
    const migrationsTableExists = Array.isArray(migrationsTableCheckResults) && 
                                 migrationsTableCheckResults.length > 0 && 
                                 migrationsTableCheckResults[0] && 
                                 (migrationsTableCheckResults[0] as Record<string, unknown>)["exists"] === true;
    
    if (migrationsTableExists) {
      await sequelize.query(`
        INSERT INTO "${dbSchema}"."migrations" (name, applied_at)
        VALUES ('customer_profile_identity_fields_fix', NOW());
      `);
    } else {
      console.log('Migrations table does not exist, creating it...');
      await sequelize.query(`
        CREATE TABLE "${dbSchema}"."migrations" (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        INSERT INTO "${dbSchema}"."migrations" (name, applied_at)
        VALUES ('customer_profile_identity_fields_fix', NOW());
      `);
    }
    
    console.log('Customers table fix completed successfully');
    return NextResponse.json({ 
      success: true, 
      message: 'Customers table fixed successfully with missing profile fields' 
    });
    
  } catch (error) {
    console.error('Customers table fix error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error during customers table fix', 
      error: (error as Error).message,
      stack: (error as Error).stack
    }, { status: 500 });
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
  });
} 
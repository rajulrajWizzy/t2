export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import sequelize from '@/config/database';

// This is a one-time setup route that should be removed after use
export async function POST(request: NextRequest): Promise<NextResponse> {
  return await setupDatabase();
}

// Adding GET method for easier access via browser
export async function GET(): Promise<NextResponse> {
  return await setupDatabase();  
}

// Extracted setup logic to a separate function
async function setupDatabase(): Promise<NextResponse> {
  try {
    console.log('Starting database setup process...');

    const dbSchema = process.env.DB_SCHEMA || 'public';
    console.log(`Using DB schema: ${dbSchema}`);
    
    // Check if admins table exists
    const [tableCheckResults] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '${dbSchema}'
        AND table_name = 'admins'
      ) as "exists";
    `);
    
    // Properly check if table exists with type safety
    const tableExists = Array.isArray(tableCheckResults) && 
                       tableCheckResults.length > 0 && 
                       tableCheckResults[0] && 
                       (tableCheckResults[0] as Record<string, unknown>)["exists"] === true;
    
    if (tableExists) {
      console.log('Admins table already exists, nothing to do');
      return NextResponse.json({ 
        success: true, 
        message: 'Admins table already exists' 
      });
    }
    
    console.log('Creating admins table...');
    // Create the admins table
    await sequelize.query(`
      CREATE TABLE "${dbSchema}"."admins" (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(255),
        profile_image VARCHAR(255),
        role VARCHAR(255) NOT NULL DEFAULT 'branch_admin',
        branch_id INTEGER,
        permissions JSONB,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        last_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Creating indexes...');
    await sequelize.query(`
      CREATE INDEX idx_admins_username ON "${dbSchema}"."admins" (username);
      CREATE INDEX idx_admins_email ON "${dbSchema}"."admins" (email);
      CREATE INDEX idx_admins_role ON "${dbSchema}"."admins" (role);
      CREATE INDEX idx_admins_branch_id ON "${dbSchema}"."admins" (branch_id);
    `);
    
    console.log('Creating default admin user...');
    // Create default super admin
    await sequelize.query(`
      INSERT INTO "${dbSchema}"."admins" (
        username, email, password, name, role, is_active,
        created_at, updated_at
      )
      VALUES (
        'superadmin', 
        'admin@coworks.com', 
        '$2b$10$OMUZjWLfF05YqIZH7/XY9.t0FrSoYvOGNP6rrX9yDEIR5yCHx1.Ly', 
        'Super Admin', 
        'super_admin', 
        TRUE,
        NOW(), 
        NOW()
      );
    `);
    
    console.log('Recording migration...');
    // First check if migrations table exists
    const [migrationsCheckResults] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '${dbSchema}'
        AND table_name = 'migrations'
      ) as "exists";
    `);
    
    // Properly check if migrations table exists with type safety
    const migrationsTableExists = Array.isArray(migrationsCheckResults) && 
                                 migrationsCheckResults.length > 0 && 
                                 migrationsCheckResults[0] && 
                                 (migrationsCheckResults[0] as Record<string, unknown>)["exists"] === true;
    
    if (migrationsTableExists) {
      await sequelize.query(`
        INSERT INTO "${dbSchema}"."migrations" (name, applied_at)
        VALUES ('admin_table_fix', NOW());
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
        VALUES ('admin_table_fix', NOW());
      `);
    }
    
    console.log('Setup completed successfully');
    return NextResponse.json({ 
      success: true, 
      message: 'Admins table created successfully with default super admin' 
    });
    
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error during setup', 
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
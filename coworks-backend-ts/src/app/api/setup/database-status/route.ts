export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types/common';
import models from '@/models';
import sequelize from '@/config/database';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Endpoint to check database structure and fix issues
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Test basic database connection
    await models.sequelize.authenticate();
    
    // Check all tables
    const tables = await checkTables();
    
    // Check for required columns in customers table
    const customerColumns = await checkCustomerColumns();
    
    // Check for required columns in blacklisted_tokens table
    const tokenColumns = await checkBlacklistedTokens();
    
    // Check for required columns in reset_tokens table
    const resetTokenColumns = await checkResetTokens();
    
    const response: ApiResponse<any> = {
      success: true,
      message: 'Database status check completed',
      data: {
        connection: 'successful',
        tables,
        customers: customerColumns,
        tokens: tokenColumns,
        resetTokens: resetTokenColumns
      }
    };
    
    return NextResponse.json(response, { headers: corsHeaders });
  } catch (error) {
    console.error('Database status check failed:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      message: 'Database status check failed',
      error: (error as Error).message,
      data: null
    };
    
    return NextResponse.json(response, { status: 500, headers: corsHeaders });
  }
}

/**
 * Fix database issues
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Collect issues to fix
    const missingColumns = [];
    
    // Check customers table
    const customerColumns = await checkCustomerColumns();
    if (!customerColumns.hasProofOfIdentity) {
      missingColumns.push('Adding proof_of_identity to customers');
      await sequelize.query(`
        ALTER TABLE customers 
        ADD COLUMN IF NOT EXISTS proof_of_identity TEXT
      `);
    }
    
    if (!customerColumns.hasProofOfAddress) {
      missingColumns.push('Adding proof_of_address to customers');
      await sequelize.query(`
        ALTER TABLE customers 
        ADD COLUMN IF NOT EXISTS proof_of_address TEXT
      `);
    }
    
    // Check tokens table
    const tokenColumns = await checkBlacklistedTokens();
    if (!tokenColumns.exists) {
      missingColumns.push('Creating blacklisted_tokens table');
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS blacklisted_tokens (
          id SERIAL PRIMARY KEY,
          token TEXT NOT NULL,
          blacklisted_at TIMESTAMP NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
    } else if (!tokenColumns.hasExpiresAt) {
      missingColumns.push('Adding expires_at to blacklisted_tokens');
      await sequelize.query(`
        ALTER TABLE blacklisted_tokens 
        ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '24 hour')
      `);
    }
    
    // Check reset tokens table
    const resetTokenColumns = await checkResetTokens();
    if (!resetTokenColumns.exists) {
      missingColumns.push('Creating reset_tokens table');
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS reset_tokens (
          id SERIAL PRIMARY KEY,
          token VARCHAR(64) NOT NULL,
          user_id INTEGER NOT NULL,
          user_type VARCHAR(10) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          is_used BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
    }
    
    // Return the fixes applied
    const response: ApiResponse<any> = {
      success: true,
      message: missingColumns.length > 0 
        ? `Fixed ${missingColumns.length} database issues` 
        : 'No database issues to fix',
      data: {
        fixesApplied: missingColumns,
        customers: await checkCustomerColumns(),
        tokens: await checkBlacklistedTokens(),
        resetTokens: await checkResetTokens()
      }
    };
    
    return NextResponse.json(response, { headers: corsHeaders });
  } catch (error) {
    console.error('Database fix operation failed:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      message: 'Failed to fix database issues',
      error: (error as Error).message,
      data: null
    };
    
    return NextResponse.json(response, { status: 500, headers: corsHeaders });
  }
}

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}

/**
 * Check if tables exist in the database
 */
async function checkTables(): Promise<any> {
  try {
    const [results] = await sequelize.query(`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public'
    `);
    
    const tableNames = (results as any[]).map(r => r.tablename);
    
    return {
      tables: tableNames,
      customersExists: tableNames.includes('customers'),
      blacklistedTokensExists: tableNames.includes('blacklisted_tokens'),
      resetTokensExists: tableNames.includes('reset_tokens')
    };
  } catch (error) {
    console.error('Error checking tables:', error);
    return { error: (error as Error).message };
  }
}

/**
 * Check if customers table has required columns
 */
async function checkCustomerColumns(): Promise<any> {
  try {
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'customers'
    `);
    
    const columnNames = (columns as any[]).map(c => c.column_name);
    
    return {
      hasTable: columns.length > 0,
      columnCount: columns.length,
      hasProofOfIdentity: columnNames.includes('proof_of_identity'),
      hasProofOfAddress: columnNames.includes('proof_of_address'),
      columns: columnNames
    };
  } catch (error) {
    console.error('Error checking customers table:', error);
    return { 
      error: (error as Error).message,
      hasTable: false,
      hasProofOfIdentity: false,
      hasProofOfAddress: false
    };
  }
}

/**
 * Check if blacklisted_tokens table has required columns
 */
async function checkBlacklistedTokens(): Promise<any> {
  try {
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'blacklisted_tokens'
    `);
    
    const columnNames = (columns as any[]).map(c => c.column_name);
    
    return {
      exists: columns.length > 0,
      columnCount: columns.length,
      hasExpiresAt: columnNames.includes('expires_at'),
      columns: columnNames
    };
  } catch (error) {
    console.error('Error checking blacklisted_tokens table:', error);
    return { 
      error: (error as Error).message,
      exists: false,
      hasExpiresAt: false
    };
  }
}

/**
 * Check if reset_tokens table has required columns
 */
async function checkResetTokens(): Promise<any> {
  try {
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'reset_tokens'
    `);
    
    const columnNames = (columns as any[]).map(c => c.column_name);
    
    return {
      exists: columns.length > 0,
      columnCount: columns.length,
      columns: columnNames
    };
  } catch (error) {
    console.error('Error checking reset_tokens table:', error);
    return { 
      error: (error as Error).message,
      exists: false
    };
  }
} 
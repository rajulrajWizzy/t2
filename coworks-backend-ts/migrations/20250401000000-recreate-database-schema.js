'use strict';

/**
 * Migration: recreate-database-schema
 * Generated: 2025-03-27T00:15:00.000Z
 * 
 * This migration recreates the entire database schema from scratch.
 * WARNING: This will drop and recreate all tables, resulting in data loss.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop all existing tables in reverse order of creation (to handle foreign key constraints)
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS customer_coin_transactions CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS branch_images CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS ticket_messages CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS support_tickets CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS reset_token CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS password_reset CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS blacklisted_tokens CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS time_slots CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS payment_logs CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS meeting_bookings CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS seat_bookings CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS seats CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS seating_types CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS customers CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS admin_branches CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS admins CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS admin_users CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS branches CASCADE;');
    
    // Set schema
    await queryInterface.sequelize.query('CREATE SCHEMA IF NOT EXISTS public;');
    await queryInterface.sequelize.query('SET search_path TO public;');
    
    // Create migrations table if it doesn't exist
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // Create branches table
    await queryInterface.sequelize.query(`
      CREATE TABLE branches (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        location TEXT NOT NULL,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        cost_multiplier DECIMAL(3, 2) NOT NULL DEFAULT 1.00,
        opening_time TIME NOT NULL DEFAULT '08:00:00',
        closing_time TIME NOT NULL DEFAULT '22:00:00',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        images JSONB,
        amenities JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create admins table
    await queryInterface.sequelize.query(`
      CREATE TABLE admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(100) NOT NULL,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        profile_image VARCHAR(255),
        role VARCHAR(20) NOT NULL DEFAULT 'branch_admin',
        branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
        permissions JSONB,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        last_login TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create admin_branches bridge table
    await queryInterface.sequelize.query(`
      CREATE TABLE admin_branches (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
        branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(admin_id, branch_id)
      );
    `);
    
    // Create customers table
    await queryInterface.sequelize.query(`
      CREATE TABLE customers (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        profile_image VARCHAR(255),
        address TEXT,
        is_verified BOOLEAN NOT NULL DEFAULT FALSE,
        verification_token VARCHAR(100),
        verification_expires TIMESTAMP,
        role VARCHAR(20) NOT NULL DEFAULT 'customer',
        coins INTEGER NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        last_login TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create seating_types table
    await queryInterface.sequelize.query(`
      CREATE TABLE seating_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        hourly_rate DECIMAL(10, 2) NOT NULL,
        daily_rate DECIMAL(10, 2),
        weekly_rate DECIMAL(10, 2),
        monthly_rate DECIMAL(10, 2),
        capacity INTEGER,
        amenities JSONB,
        is_meeting_room BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        image_url VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create seats table
    await queryInterface.sequelize.query(`
      CREATE TABLE seats (
        id SERIAL PRIMARY KEY,
        branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        seating_type_id INTEGER NOT NULL REFERENCES seating_types(id) ON DELETE RESTRICT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        seat_number VARCHAR(50),
        capacity INTEGER NOT NULL DEFAULT 1,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        features JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(branch_id, seat_number)
      );
    `);
    
    // Create seat_bookings table
    await queryInterface.sequelize.query(`
      CREATE TABLE seat_bookings (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        seat_id INTEGER NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
        total_amount DECIMAL(10, 2) NOT NULL,
        notes TEXT,
        check_in_time TIMESTAMP,
        check_out_time TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create meeting_bookings table
    await queryInterface.sequelize.query(`
      CREATE TABLE meeting_bookings (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        meeting_room_id INTEGER NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        attendees INTEGER NOT NULL DEFAULT 1,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
        total_amount DECIMAL(10, 2) NOT NULL,
        check_in_time TIMESTAMP,
        check_out_time TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create payment_logs table
    await queryInterface.sequelize.query(`
      CREATE TABLE payment_logs (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER NOT NULL,
        booking_type VARCHAR(20) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) NOT NULL,
        payment_method VARCHAR(50),
        transaction_id VARCHAR(100),
        gateway_response JSONB,
        payment_date TIMESTAMP,
        refund_status VARCHAR(20),
        refund_amount DECIMAL(10, 2),
        refund_date TIMESTAMP,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create time_slots table
    await queryInterface.sequelize.query(`
      CREATE TABLE time_slots (
        id SERIAL PRIMARY KEY,
        branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        seat_id INTEGER NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
        booking_id INTEGER REFERENCES seat_bookings(id) ON DELETE SET NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        is_available BOOLEAN NOT NULL DEFAULT TRUE,
        price DECIMAL(10, 2),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create blacklisted_tokens table
    await queryInterface.sequelize.query(`
      CREATE TABLE blacklisted_tokens (
        id SERIAL PRIMARY KEY,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create password_reset table
    await queryInterface.sequelize.query(`
      CREATE TABLE password_reset (
        id SERIAL PRIMARY KEY,
        email VARCHAR(100) NOT NULL,
        token VARCHAR(100) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create reset_token table
    await queryInterface.sequelize.query(`
      CREATE TABLE reset_token (
        id SERIAL PRIMARY KEY,
        email VARCHAR(100) NOT NULL,
        token VARCHAR(100) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        is_used BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create support_tickets table
    await queryInterface.sequelize.query(`
      CREATE TABLE support_tickets (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
        seating_type_id INTEGER REFERENCES seating_types(id) ON DELETE SET NULL,
        subject VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'open',
        priority VARCHAR(20) NOT NULL DEFAULT 'medium',
        assigned_to INTEGER REFERENCES admins(id) ON DELETE SET NULL,
        closed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create ticket_messages table
    await queryInterface.sequelize.query(`
      CREATE TABLE ticket_messages (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        sender_type VARCHAR(20) NOT NULL,
        sender_id INTEGER NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create branch_images table
    await queryInterface.sequelize.query(`
      CREATE TABLE branch_images (
        id SERIAL PRIMARY KEY,
        branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        image_url VARCHAR(255) NOT NULL,
        caption VARCHAR(255),
        display_order INTEGER NOT NULL DEFAULT 0,
        is_primary BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create customer_coin_transactions table
    await queryInterface.sequelize.query(`
      CREATE TABLE customer_coin_transactions (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        transaction_type VARCHAR(50) NOT NULL,
        booking_id INTEGER,
        booking_type VARCHAR(20),
        description TEXT NOT NULL,
        balance_after INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create indices for performance
    await queryInterface.sequelize.query(`CREATE INDEX idx_branches_is_active ON branches(is_active);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_admins_role ON admins(role);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_admins_branch_id ON admins(branch_id);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_admin_branches_admin_id ON admin_branches(admin_id);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_admin_branches_branch_id ON admin_branches(branch_id);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_customers_status ON customers(status);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_seating_types_is_active ON seating_types(is_active);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_seats_branch_id ON seats(branch_id);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_seats_seating_type_id ON seats(seating_type_id);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_seats_is_active ON seats(is_active);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_seat_bookings_customer_id ON seat_bookings(customer_id);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_seat_bookings_seat_id ON seat_bookings(seat_id);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_seat_bookings_status ON seat_bookings(status);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_seat_bookings_payment_status ON seat_bookings(payment_status);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_meeting_bookings_customer_id ON meeting_bookings(customer_id);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_meeting_bookings_meeting_room_id ON meeting_bookings(meeting_room_id);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_meeting_bookings_status ON meeting_bookings(status);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_payment_logs_booking_id ON payment_logs(booking_id);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_payment_logs_booking_type ON payment_logs(booking_type);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_payment_logs_status ON payment_logs(status);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_time_slots_branch_id ON time_slots(branch_id);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_time_slots_seat_id ON time_slots(seat_id);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_time_slots_booking_id ON time_slots(booking_id);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_time_slots_is_available ON time_slots(is_available);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_blacklisted_tokens_token ON blacklisted_tokens(token);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_blacklisted_tokens_expires_at ON blacklisted_tokens(expires_at);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_password_reset_email ON password_reset(email);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_password_reset_token ON password_reset(token);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_reset_token_email ON reset_token(email);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_reset_token_token ON reset_token(token);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_support_tickets_customer_id ON support_tickets(customer_id);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_support_tickets_branch_id ON support_tickets(branch_id);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_support_tickets_status ON support_tickets(status);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_branch_images_branch_id ON branch_images(branch_id);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_customer_coin_transactions_customer_id ON customer_coin_transactions(customer_id);`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_customer_coin_transactions_transaction_type ON customer_coin_transactions(transaction_type);`);
  },

  async down(queryInterface, Sequelize) {
    // Drop tables in reverse order
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS customer_coin_transactions CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS branch_images CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS ticket_messages CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS support_tickets CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS reset_token CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS password_reset CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS blacklisted_tokens CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS time_slots CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS payment_logs CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS meeting_bookings CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS seat_bookings CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS seats CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS seating_types CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS customers CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS admin_branches CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS admins CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS branches CASCADE;');
  }
}; 
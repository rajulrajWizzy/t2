-- Create the customer_coins table
CREATE TABLE IF NOT EXISTS excel_coworks_schema.customer_coins (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES excel_coworks_schema.customers(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  is_daily_pass BOOLEAN NOT NULL DEFAULT FALSE,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add index for faster lookups by customer ID
CREATE INDEX IF NOT EXISTS idx_customer_coins_customer_id ON excel_coworks_schema.customer_coins(customer_id);

-- Create the coin_transactions table
CREATE TABLE IF NOT EXISTS excel_coworks_schema.coin_transactions (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES excel_coworks_schema.customers(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('CREDIT', 'DEBIT', 'PURCHASE')),
  description VARCHAR(255) NOT NULL,
  reference_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes for faster searches
CREATE INDEX IF NOT EXISTS idx_coin_transactions_customer_id ON excel_coworks_schema.coin_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_created_at ON excel_coworks_schema.coin_transactions(created_at);

-- Add a comment to explain how to run this migration
COMMENT ON TABLE excel_coworks_schema.customer_coins IS 'Table for storing customer coin balances. Run this migration using: psql -U your_user -d your_database -f coins.sql'; 
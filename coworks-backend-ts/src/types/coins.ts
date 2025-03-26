/**
 * Types of coin transactions
 */
export enum CoinTransactionTypeEnum {
  CREDIT = 'CREDIT', // Adding coins to balance
  DEBIT = 'DEBIT',   // Using coins for bookings
  RESET = 'RESET'    // Monthly reset of coins
}

/**
 * Customer coin transaction interface
 */
export interface CustomerCoinTransaction {
  id: number;
  customer_id: number;
  transaction_type: CoinTransactionTypeEnum;
  amount: number; // Number of coins added or removed
  booking_id?: number; // Meeting booking ID if transaction is related to a booking
  booking_type?: string; // Type of booking
  description?: string; // Description of the transaction
  created_at: Date;
  updated_at: Date;
}

/**
 * Customer coin transaction creation attributes
 */
export interface CustomerCoinTransactionInput {
  customer_id: number;
  transaction_type: CoinTransactionTypeEnum;
  amount: number;
  booking_id?: number;
  booking_type?: string;
  description?: string;
} 
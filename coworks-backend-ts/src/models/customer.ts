// src/models/customer.ts
import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';
import { Customer, CustomerAttributes, UserRole } from '@/types/auth';

// Interface for creation attributes
<<<<<<< Updated upstream
interface CustomerCreationAttributes extends Optional<CustomerAttributes, 'id' | 'created_at' | 'updated_at' | 'profile_picture' | 'proof_of_identity' | 'proof_of_address' | 'address'> {}
=======
interface CustomerCreationAttributes extends Optional<CustomerAttributes, 'id' | 'created_at' | 'updated_at' | 'profile_picture' | 'proof_of_identity' | 'proof_of_address' | 'address' | 'is_identity_verified' | 'is_address_verified' | 'verification_status' | 'verification_notes' | 'verification_date' | 'verified_by' | 'coins_balance' | 'coins_last_reset' | 'role'> {}
>>>>>>> Stashed changes

// Define the Customer model
class CustomerModel extends Model<Customer, CustomerCreationAttributes> implements Customer {
  public id!: number;
  public name!: string;
  public email!: string;
  public phone!: string | null;
  public password!: string;
  public profile_picture!: string | null;
  public company_name!: string;
  public proof_of_identity!: string | null;
  public proof_of_address!: string | null;
  public address!: string | null;
<<<<<<< Updated upstream
=======
  public is_identity_verified!: boolean;
  public is_address_verified!: boolean;
  public verification_status!: 'PENDING' | 'APPROVED' | 'REJECTED';
  public verification_notes!: string | null;
  public verification_date!: Date | null;
  public verified_by!: number | null;
  public coins_balance!: number;
  public coins_last_reset!: Date;
  public role!: UserRole;
>>>>>>> Stashed changes
  public created_at!: Date;
  public updated_at!: Date;

  // Add any instance methods here
<<<<<<< Updated upstream
=======
  
  /**
   * Check if the customer's profile is completely verified
   * @returns boolean indicating if the customer can make bookings
   */
  public isVerifiedForBooking(): boolean {
    return this.verification_status === 'APPROVED' && 
           this.is_identity_verified && 
           this.is_address_verified;
  }

  /**
   * Check if user has specific role
   * @param role The role to check
   * @returns boolean indicating if user has the specified role
   */
  public hasRole(role: UserRole): boolean {
    return this.role === role;
  }

  /**
   * Reset the customer's coins if needed (monthly reset)
   * @returns boolean indicating if coins were reset
   */
  public async resetCoinsIfNeeded(): Promise<boolean> {
    const MAX_COINS = 1196; // Maximum coins a user can have
    const now = new Date();
    const lastReset = new Date(this.coins_last_reset);
    
    // Check if it's a new month since last reset
    const isNewMonth = 
      now.getMonth() !== lastReset.getMonth() || 
      now.getFullYear() !== lastReset.getFullYear();
    
    if (isNewMonth) {
      // Reset coins to max amount
      this.coins_balance = MAX_COINS;
      this.coins_last_reset = now;
      await this.save();
      
      // Create a coin transaction record for the reset
      await sequelize.models.CustomerCoinTransaction.create({
        customer_id: this.id,
        transaction_type: 'RESET',
        amount: MAX_COINS,
        description: 'Monthly coin reset'
      });
      
      return true;
    }
    
    return false;
  }

  /**
   * Deduct coins from customer's balance
   * @param amount Number of coins to deduct
   * @param bookingId Optional booking ID for transaction record
   * @param description Optional transaction description
   * @returns Updated coin balance
   */
  public async deductCoins(amount: number | string, bookingId?: number, description?: string): Promise<number> {
    const amountToDeduct = typeof amount === 'string' ? Number(amount) : amount;
    
    if (amountToDeduct <= 0) throw new Error('Amount must be positive');
    if (this.coins_balance < amountToDeduct) throw new Error('Insufficient coins');
    
    this.coins_balance -= amountToDeduct;
    await this.save();
    
    // Create transaction record
    await sequelize.models.CustomerCoinTransaction.create({
      customer_id: this.id,
      transaction_type: 'DEBIT',
      amount: amountToDeduct,
      booking_id: bookingId,
      booking_type: bookingId ? 'meeting' : undefined,
      description: description || 'Coins used for booking'
    });
    
    return this.coins_balance;
  }

  /**
   * Add coins to customer's balance up to the maximum allowed
   * @param amount Number of coins to add
   * @param description Transaction description
   * @returns Updated coin balance
   */
  public async addCoins(amount: number, description?: string): Promise<number> {
    const MAX_COINS = 1196; // Maximum coins a user can have
    
    if (amount <= 0) throw new Error('Amount must be positive');
    
    // Only add coins up to the maximum
    const coinsToAdd = Math.min(amount, MAX_COINS - this.coins_balance);
    
    if (coinsToAdd > 0) {
      this.coins_balance += coinsToAdd;
      await this.save();
      
      // Create transaction record
      await sequelize.models.CustomerCoinTransaction.create({
        customer_id: this.id,
        transaction_type: 'CREDIT',
        amount: coinsToAdd,
        description: description || 'Coins added'
      });
    }
    
    return this.coins_balance;
  }
>>>>>>> Stashed changes
}

CustomerModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    profile_picture: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    company_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    proof_of_identity: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    proof_of_address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
<<<<<<< Updated upstream
=======
    is_identity_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_address_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    verification_status: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    verification_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    verification_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    verified_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    coins_balance: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1196, // Default monthly allocation
    },
    coins_last_reset: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      defaultValue: UserRole.USER,
      allowNull: false,
    },
>>>>>>> Stashed changes
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'customers',
    sequelize,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeCreate: async (customer) => {
        // Set the initial coins balance and reset date
        customer.coins_balance = 1196;
        customer.coins_last_reset = new Date();
      }
    }
  }
);

export default CustomerModel;
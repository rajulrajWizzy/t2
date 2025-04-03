// src/models/customer.ts
import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';
import { Customer, CustomerAttributes } from '@/types/auth';
import { calculateBookingCoins, calculateActivityCoins } from '@/utils/coinSystem';

// Interface for creation attributes
interface CustomerCreationAttributes extends Optional<CustomerAttributes, 'id' | 'created_at' | 'updated_at' | 'profile_picture' | 'proof_of_identity' | 'proof_of_address' | 'address' | 'is_identity_verified' | 'is_address_verified' | 'verification_status' | 'verification_notes' | 'verification_date' | 'verified_by'> {}

// Define the Customer model
class CustomerModel extends Model<Customer, CustomerCreationAttributes> implements Customer {
  declare id: number;
  declare name: string;
  declare email: string;
  declare phone: string | null;
  declare password: string;
  declare profile_picture: string | null;
  declare company_name: string;
  declare proof_of_identity: string | null;
  declare proof_of_address: string | null;
  declare address: string | null;
  declare is_identity_verified: boolean;
  declare is_address_verified: boolean;
  declare verification_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  declare verification_notes: string | null;
  declare verification_date: Date | null;
  declare verified_by: number | null;
  declare created_at: Date;
  declare updated_at: Date;
  declare coins: number;

  // Add any instance methods here

  /**
   * Add coins to the customer's balance
   * @param amount Number of coins to add
   * @param seatingType Type of seating (daily_pass, monthly, etc)
   */
  public async addCoins(amount: number, seatingType: string): Promise<void> {
    // Don't award coins for daily pass bookings
    if (seatingType === 'daily_pass') {
      this.coins = 0;
      await this.save();
      return;
    }

    // Add coins up to maximum limit
    const newTotal = Math.min(this.coins + amount, 1196);
    this.coins = newTotal;
    await this.save();
  }

  /**
   * Use coins from the customer's balance for meeting room bookings
   * @param amount Number of coins to use
   * @param bookingType Type of booking (meeting_room, seat)
   * @returns boolean indicating if coins were successfully used
   */
  public async useCoins(amount: number, bookingType: string): Promise<boolean> {
    // Coins can only be used for meeting room bookings
    if (bookingType !== 'meeting_room') {
      return false;
    }

    if (this.coins >= amount) {
      this.coins -= amount;
      await this.save();
      return true;
    }
    return false;
  }

  /**
   * Get current coin balance
   * @returns number of coins available
   */
  public getCoinBalance(): number {
    return this.coins;
  }
  
  /**
   * Check if the customer's profile is completely verified
   * @returns boolean indicating if the customer can make bookings
   */
  public isVerifiedForBooking(): boolean {
    return this.verification_status === 'APPROVED' && 
           this.is_identity_verified && 
           this.is_address_verified;
  }
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
      defaultValue: '',
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
      allowNull: true,
      defaultValue: '',
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
      type: DataTypes.STRING,
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
    coins: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
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
    schema: 'excel_coworks_schema',
    sequelize,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default CustomerModel;
// src/models/customer.ts
import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';
import { Customer, CustomerAttributes } from '@/types/auth';

// Interface for creation attributes
interface CustomerCreationAttributes extends Optional<CustomerAttributes, 'id' | 'created_at' | 'updated_at' | 'profile_picture' | 'proof_of_identity' | 'proof_of_address' | 'address' | 'is_identity_verified' | 'is_address_verified' | 'verification_status' | 'verification_notes' | 'verification_date' | 'verified_by'> {}

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
  public is_identity_verified!: boolean;
  public is_address_verified!: boolean;
  public verification_status!: 'PENDING' | 'APPROVED' | 'REJECTED';
  public verification_notes!: string | null;
  public verification_date!: Date | null;
  public verified_by!: number | null;
  public created_at!: Date;
  public updated_at!: Date;

  // Add any instance methods here
  
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
  }
);

export default CustomerModel;
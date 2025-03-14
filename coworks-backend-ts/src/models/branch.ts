// src/models/branch.ts
import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';
import { Branch, BranchAttributes } from '@/types/branch';

// Interface for creation attributes
interface BranchCreationAttributes extends Optional<BranchAttributes, 'id' | 'created_at' | 'updated_at'> {}

// Define the Branch model
class BranchModel extends Model<Branch, BranchCreationAttributes> implements Branch {
  public id!: number;
  public name!: string;
  public code!: string; // Added code field
  public address!: string;
  public city!: string;
  public state!: string;
  public country!: string;
  public postal_code!: string;
  public phone!: string;
  public email!: string;
  public capacity!: number;
  public operating_hours!: string;
  public is_active!: boolean;
  public created_at!: Date;
  public updated_at!: Date;

  // Add any instance methods here
}

BranchModel.init(
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
    code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    postal_code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    operating_hours: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '9:00 AM - 5:00 PM',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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
    tableName: 'branches',
    sequelize,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default BranchModel;
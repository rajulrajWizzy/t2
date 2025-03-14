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
  public location?: string;
  public latitude!: number;
  public longitude!: number;
  public cost_multiplier!: number;
  public opening_time!: string;
  public closing_time!: string;
  public city?: string;
  public state?: string;
  public country?: string;
  public postal_code?: string;
  public phone?: string;
  public email?: string;
  public capacity?: number;
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
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    cost_multiplier: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 1.0,
    },
    opening_time: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: '08:00:00',
    },
    closing_time: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: '22:00:00',
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'Bengaluru',
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'Karnataka',
    },
    country: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'India',
    },
    postal_code: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
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
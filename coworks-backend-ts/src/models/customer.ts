import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';
import { Customer, CustomerAttributes } from '@/types/auth';

// Interface for creation attributes
interface CustomerCreationAttributes extends Optional<CustomerAttributes, 'id' | 'created_at' | 'updated_at'> {}

// Define the Customer model
class CustomerModel extends Model<Customer, CustomerCreationAttributes> implements Customer {
  public id!: number;
  public name!: string;
  public email!: string;
  public phone!: string | null;
  public company_name!: string | null;
  public password!: string;
  public reset_token!: string | null;
  public reset_token_expires!: Date | null;
  public created_at!: Date;
  public updated_at!: Date;

  // Add any instance methods here
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
    company_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    reset_token: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reset_token_expires: {
      type: DataTypes.DATE,
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
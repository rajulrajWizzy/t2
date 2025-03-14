// src/models/customer.ts
import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';
import { Customer, CustomerAttributes } from '@/types/auth';
import { isValidEmail, isValidPhone, isValidName } from '@/utils/validation';
// Interface for creation attributes
interface CustomerCreationAttributes extends Optional<CustomerAttributes, 'id' | 'created_at' | 'updated_at' | 'profile_picture' | 'company_name'> {}

// Define the Customer model
class CustomerModel extends Model<Customer, CustomerCreationAttributes> implements Customer {
  public id!: number;
  public name!: string;
  public email!: string;
  public phone!: string | null;
  public password!: string;
  public profile_picture!: string | null;
  public company_name!: string | null;
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
      validate: {
        isValidName(value: string) {
          if (!isValidName(value)) {
            throw new Error('Name must contain only alphabetic characters and spaces');
          }
        },
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isValidEmail(value: string) {
          if (!isValidEmail(value)) {
            throw new Error('Please enter a valid email address');
          }
        },
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isValidPhone(value: string) {
          if (!isValidPhone(value)) {
            throw new Error('Please enter a valid phone number');
          }
        },
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Password is required',
        },
        len: {
          args: [8, 100],
          msg: 'Password must be at least 8 characters long',
        },
      },
    },
    profile_picture: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    company_name: {
      type: DataTypes.STRING,
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
import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';
import { Branch, BranchAttributes } from '@/types/branch';
import { isValidEmail, isValidPhone, isValidName, isValidPostalCode } from '@/utils/validation';

// Interface for creation attributes
interface BranchCreationAttributes extends Optional<BranchAttributes, 'id' | 'created_at' | 'updated_at'> {}

// Define the Branch model
class BranchModel extends Model<Branch, BranchCreationAttributes> implements Branch {
  public id!: number;
  public name!: string;
  public code!: string;
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
      validate: {
        isValidName(value: string) {
          if (!isValidName(value)) {
            throw new Error('Branch name must contain only alphabetic characters and spaces');
          }
        },
      },
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: 'Branch code is required',
        },
        isUppercase: {
          msg: 'Branch code must be uppercase',
        },
        len: {
          args: [2, 5],
          msg: 'Branch code must be 2-5 characters long',
        },
      },
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Address is required',
        },
      },
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isValidName(value: string) {
          if (!isValidName(value)) {
            throw new Error('City must contain only alphabetic characters and spaces');
          }
        },
      },
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isValidName(value: string) {
          if (!isValidName(value)) {
            throw new Error('State must contain only alphabetic characters and spaces');
          }
        },
      },
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isValidName(value: string) {
          if (!isValidName(value)) {
            throw new Error('Country must contain only alphabetic characters and spaces');
          }
        },
      },
    },
    postal_code: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isValidPostalCode(value: string) {
          if (!isValidPostalCode(value)) {
            throw new Error('Please enter a valid postal code');
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
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isValidEmail(value: string) {
          if (!isValidEmail(value)) {
            throw new Error('Please enter a valid email address');
          }
        },
      },
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        isInt: {
          msg: 'Capacity must be a number',
        },
        min: {
          args: [0],
          msg: 'Capacity cannot be negative',
        },
      },
    },
    operating_hours: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '9:00 AM - 5:00 PM',
      validate: {
        notEmpty: {
          msg: 'Operating hours are required',
        },
      },
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
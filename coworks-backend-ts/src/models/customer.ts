// src/models/customer.ts
import { Model, DataTypes, Optional } from 'sequelize';
import { UserRole } from '@/types/auth';
import sequelize from '@/config/database';
import bcrypt from 'bcryptjs';

interface CustomerAttributes {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  password: string;
  profile_picture: string | null;
  company_name: string | null;
  role: UserRole;
  managed_branch_id: number | null;
  is_admin: boolean;
  created_at: Date;
  updated_at: Date;
}

interface CustomerCreationAttributes extends Optional<CustomerAttributes, 'id' | 'created_at' | 'updated_at' | 'phone' | 'profile_picture' | 'company_name' | 'is_admin' | 'managed_branch_id'> {}

class CustomerModel extends Model<CustomerAttributes, CustomerCreationAttributes> {
  public id!: number;
  public name!: string;
  public email!: string;
  public phone!: string | null;
  public password!: string;
  public profile_picture!: string | null;
  public company_name!: string | null;
  public role!: UserRole;
  public managed_branch_id!: number | null;
  public is_admin!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Helper methods for role checks
  public isSuperAdmin(): boolean {
    return this.role === UserRole.SUPER_ADMIN;
  }

  public isBranchAdmin(): boolean {
    return this.role === UserRole.BRANCH_ADMIN;
  }

  public isCustomer(): boolean {
    return this.role === UserRole.CUSTOMER;
  }

  public canManageBranch(branchId: number): boolean {
    return this.isSuperAdmin() || (this.isBranchAdmin() && this.managed_branch_id === branchId);
  }

  public async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}

CustomerModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
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
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      allowNull: false,
      defaultValue: UserRole.CUSTOMER,
    },
    managed_branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    is_admin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'Customer',
    tableName: 'customers',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (customer: CustomerModel) => {
        if (customer.password) {
          const salt = await bcrypt.genSalt(10);
          customer.password = await bcrypt.hash(customer.password, salt);
        }
      },
      beforeUpdate: async (customer: CustomerModel) => {
        // Only hash password again if it was changed
        if (customer.changed('password') && customer.password) {
          const salt = await bcrypt.genSalt(10);
          customer.password = await bcrypt.hash(customer.password, salt);
        }
      },
    },
  }
);

export default CustomerModel;
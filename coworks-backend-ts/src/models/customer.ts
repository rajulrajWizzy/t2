// src/models/customer.ts
import { Model, DataTypes, Optional } from 'sequelize';
import { UserRole } from '@/types/auth';
import sequelize from '@/config/database';

interface CustomerAttributes {
  id: number;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  managed_branch_id?: number | null;
  created_at: Date;
  updated_at: Date;
}

interface CustomerCreationAttributes extends Optional<CustomerAttributes, 'id' | 'created_at' | 'updated_at'> {}

class CustomerModel extends Model<CustomerAttributes, CustomerCreationAttributes> {
  public id!: number;
  public name!: string;
  public email!: string;
  public password!: string;
  public role!: UserRole;
  public managed_branch_id?: number | null;
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
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      allowNull: false,
      defaultValue: UserRole.CUSTOMER,
    },
    managed_branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'branches',
        key: 'id',
      },
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
    tableName: 'customers',
    timestamps: true,
    underscored: true,
  }
);

export { CustomerModel };
export default CustomerModel;
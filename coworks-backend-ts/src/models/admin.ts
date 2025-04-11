import { Model, DataTypes, Optional } from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from '@/config/database';
import { db } from '@/lib/db';

// Admin roles enum
export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  BRANCH_ADMIN = 'branch_admin',
  SUPPORT_ADMIN = 'support_admin',
}

// Permission types
export type Permission = 'read' | 'create' | 'update' | 'delete';
export type ResourcePermissions = Record<string, Permission[]>;

// Admin attributes interface
export interface AdminAttributes {
  id: number;
  username: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
  profile_picture?: string;
  proof_of_identity?: string;
  proof_of_address?: string;
  role: string;
  branch_id?: number;
  permissions?: ResourcePermissions | null;
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

// Admin creation attributes
interface AdminCreationAttributes extends Optional<AdminAttributes, 'id' | 'created_at' | 'updated_at' | 'is_active' | 'permissions'> {}

// Admin model
export class Admin extends Model<AdminAttributes, AdminCreationAttributes> implements AdminAttributes {
  // Implement AdminAttributes interface
  declare id: number;
  declare email: string;
  declare username: string;
  declare password: string;
  declare name: string;
  declare role: string;
  declare branch_id?: number;
  declare is_active: boolean;
  declare permissions: ResourcePermissions | null;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;

  // Getters
  get phone(): string | undefined {
    return this.getDataValue('phone');
  }

  get profile_picture(): string | undefined {
    return this.getDataValue('profile_picture');
  }

  get proof_of_identity(): string | undefined {
    return this.getDataValue('proof_of_identity');
  }

  get proof_of_address(): string | undefined {
    return this.getDataValue('proof_of_address');
  }

  get last_login(): Date | undefined {
    return this.getDataValue('last_login');
  }

  // Password validation method
  public async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.getDataValue('password'));
  }

  // Check if admin has permission for a specific resource and action
  public hasPermission(resource: string, action: Permission): boolean {
    // Super admins have all permissions
    if (this.getDataValue('role') === AdminRole.SUPER_ADMIN) return true;
    
    // If permissions not set, deny
    const permissions = this.getDataValue('permissions');
    if (!permissions) return false;
    
    // Check if resource exists and if action is in the list
    return !!permissions[resource]?.includes(action);
  }

  // Password complexity check - returns true if password meets requirements
  public static isPasswordValid(password: string): boolean {
    // Password must be at least 8 characters long
    if (password.length < 8) return false;
    
    // Must contain at least one uppercase letter
    if (!/[A-Z]/.test(password)) return false;
    
    // Must contain at least one lowercase letter
    if (!/[a-z]/.test(password)) return false;
    
    // Must contain at least one number
    if (!/[0-9]/.test(password)) return false;
    
    // Must contain at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return false;
    
    return true;
  }

  // Check if this is the last super admin
  public static async isLastSuperAdmin(adminId: number): Promise<boolean> {
    const superAdminCount = await Admin.count({
      where: { role: AdminRole.SUPER_ADMIN, is_active: true }
    });
    
    if (superAdminCount <= 1) {
      // Check if the admin we're trying to delete/deactivate is a super admin
      const admin = await Admin.findByPk(adminId);
      return admin?.getDataValue('role') === AdminRole.SUPER_ADMIN;
    }
    
    return false;
  }

  // Email validation pattern
  public static isEmailValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  // Default permissions based on role
  public static getDefaultPermissions(role: string): ResourcePermissions | null {
    switch (role) {
      case AdminRole.SUPER_ADMIN:
        return {
          "seats": ["read", "create", "update", "delete"],
          "seating_types": ["read", "create", "update", "delete"],
          "branches": ["read", "create", "update", "delete"],
          "customers": ["read", "create", "update", "delete"],
          "bookings": ["read", "create", "update", "delete"],
          "payments": ["read", "create", "update", "delete"],
          "reports": ["read", "create", "update", "delete"],
          "admins": ["read", "create", "update", "delete"],
          "support": ["read", "create", "update", "delete"],
          "settings": ["read", "update"]
        };
      case AdminRole.BRANCH_ADMIN:
        return {
          "seats": ["read", "update"],
          "seating_types": ["read"],
          "branches": ["read"],
          "customers": ["read"],
          "bookings": ["read", "create", "update"],
          "payments": ["read"],
          "reports": ["read"],
          "admins": [],
          "support": ["read", "create", "update"],
          "settings": []
        };
      case AdminRole.SUPPORT_ADMIN:
        return {
          "seats": [],
          "seating_types": [],
          "branches": ["read"],
          "customers": ["read"],
          "bookings": ["read"],
          "payments": [],
          "reports": [],
          "admins": [],
          "support": ["read", "create", "update", "delete"],
          "settings": []
        };
      default:
        return null;
    }
  }
}

// Initialize Admin model
Admin.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'admin',
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    permissions: {
      type: DataTypes.JSONB,
      allowNull: true,
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
    sequelize: db,
    tableName: 'admins',
    schema: 'excel_coworks_schema',
    timestamps: true,
    underscored: true,
    hooks: {
      // Hash password before create
      beforeCreate: async (admin: Admin) => {
        if (admin.password) {
          const salt = await bcrypt.genSalt(10);
          admin.password = await bcrypt.hash(admin.password, salt);
        }
        
        // Set default permissions based on role if not set
        if (!admin.permissions) {
          admin.permissions = Admin.getDefaultPermissions(admin.role);
        }
      },
      // Hash password before update (if changed)
      beforeUpdate: async (admin: Admin) => {
        if (admin.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          admin.password = await bcrypt.hash(admin.password, salt);
        }
        
        // Update permissions if role changed and permissions not explicitly set
        if (admin.changed('role') && !admin.changed('permissions')) {
          admin.permissions = Admin.getDefaultPermissions(admin.role);
        }
      },
      // Validate role and branch_id consistency
      beforeSave: async (admin: Admin) => {
        // Branch admin must have a branch_id
        if (admin.role === AdminRole.BRANCH_ADMIN && !admin.branch_id) {
          throw new Error('Branch admin must be assigned to a branch');
        }
        
        // Super admin doesn't need a branch_id
        if (admin.role === AdminRole.SUPER_ADMIN && admin.branch_id) {
          admin.branch_id = undefined;
        }
      }
    },
  }
);

export default Admin; 
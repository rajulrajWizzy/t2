import { Model, DataTypes, Optional } from 'sequelize';
import bcrypt from 'bcrypt';
import sequelize from '@/config/database';

// Admin roles enum
export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  BRANCH_ADMIN = 'branch_admin',
  SUPPORT_ADMIN = 'support_admin',
}

// Admin attributes interface
export interface AdminAttributes {
  id: number;
  username: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
  profile_image?: string;
  role: string;
  branch_id?: number;
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

// Admin creation attributes
interface AdminCreationAttributes extends Optional<AdminAttributes, 'id' | 'created_at' | 'updated_at' | 'is_active'> {}

// Admin model
class Admin extends Model<AdminAttributes, AdminCreationAttributes> implements AdminAttributes {
  public id!: number;
  public username!: string;
  public email!: string;
  public password!: string;
  public name!: string;
  public phone?: string;
  public profile_image?: string;
  public role!: string;
  public branch_id?: number;
  public is_active!: boolean;
  public last_login?: Date;
  public created_at!: Date;
  public updated_at!: Date;

  // Password validation method
  public async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
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
      return admin?.role === AdminRole.SUPER_ADMIN;
    }
    
    return false;
  }
  
  // Email validation pattern
  public static isEmailValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50],
        notEmpty: true,
      },
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    profile_image: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: AdminRole.BRANCH_ADMIN,
      validate: {
        isIn: [Object.values(AdminRole)],
      },
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
    last_login: {
      type: DataTypes.DATE,
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
    sequelize,
    modelName: 'Admin',
    tableName: 'admins',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      // Hash password before create
      beforeCreate: async (admin: Admin) => {
        if (admin.password) {
          const salt = await bcrypt.genSalt(10);
          admin.password = await bcrypt.hash(admin.password, salt);
        }
      },
      // Hash password before update (if changed)
      beforeUpdate: async (admin: Admin) => {
        if (admin.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          admin.password = await bcrypt.hash(admin.password, salt);
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
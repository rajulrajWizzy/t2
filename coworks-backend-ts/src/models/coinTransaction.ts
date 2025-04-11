import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';

interface CoinTransactionAttributes {
  id: number;
  customer_id: number;
  amount: number;
  transaction_type: 'CREDIT' | 'DEBIT' | 'PURCHASE';
  description: string;
  reference_id?: string | null;
  created_at: Date;
  updated_at: Date;
}

// Define optional attributes for creation
interface CoinTransactionCreationAttributes extends Optional<CoinTransactionAttributes, 
  'id' | 'reference_id' | 'created_at' | 'updated_at'> {}

// Define the CoinTransaction model
class CoinTransactionModel extends Model<CoinTransactionAttributes, CoinTransactionCreationAttributes> 
  implements CoinTransactionAttributes {
  declare id: number;
  declare customer_id: number;
  declare amount: number;
  declare transaction_type: 'CREDIT' | 'DEBIT' | 'PURCHASE';
  declare description: string;
  declare reference_id?: string | null;
  declare created_at: Date;
  declare updated_at: Date;
}

CoinTransactionModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'customers',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    transaction_type: {
      type: DataTypes.ENUM('CREDIT', 'DEBIT', 'PURCHASE'),
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    reference_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null
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
    }
  },
  {
    sequelize,
    modelName: 'CoinTransaction',
    tableName: 'coin_transactions',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

export default CoinTransactionModel; 
import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';
import { CustomerCoinTransaction, CustomerCoinTransactionInput, CoinTransactionTypeEnum } from '@/types/coins';

// Interface for creation attributes
interface CustomerCoinTransactionCreationAttributes extends Optional<CustomerCoinTransaction, 'id' | 'created_at' | 'updated_at'> {}

// Define the CustomerCoinTransaction model
class CustomerCoinTransactionModel extends Model<CustomerCoinTransaction, CustomerCoinTransactionCreationAttributes> implements CustomerCoinTransaction {
  public id!: number;
  public customer_id!: number;
  public transaction_type!: CoinTransactionTypeEnum;
  public amount!: number;
  public booking_id!: number | undefined;
  public booking_type!: string | undefined;
  public description!: string | undefined;
  public created_at!: Date;
  public updated_at!: Date;
}

CustomerCoinTransactionModel.init(
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
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    transaction_type: {
      type: DataTypes.ENUM(...Object.values(CoinTransactionTypeEnum)),
      allowNull: false,
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    booking_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    booking_type: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
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
    tableName: 'customer_coin_transactions',
    sequelize,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default CustomerCoinTransactionModel; 
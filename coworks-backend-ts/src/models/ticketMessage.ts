import { Model, DataTypes } from 'sequelize';
import sequelize from '@/config/database';

export enum MessageSender {
  CUSTOMER = 'customer',
  ADMIN = 'admin'
}

class TicketMessageModel extends Model {
  declare id: number;
  declare ticket_id: number;
  declare message: string;
  declare sender_type: string;
  declare sender_id: number;
  declare read_at: Date | null;
  declare created_at: Date;
  declare updated_at: Date;
}

TicketMessageModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    ticket_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'support_tickets',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    sender_type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [Object.values(MessageSender)],
      },
    },
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID of the sender (customer_id or admin_id depending on sender_type)',
    },
    read_at: {
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
    modelName: 'TicketMessage',
    tableName: 'ticket_messages',
    timestamps: true,
    underscored: true,
  }
);

export default TicketMessageModel; 
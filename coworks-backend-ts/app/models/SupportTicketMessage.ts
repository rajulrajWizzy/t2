import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';
import SupportTicket from './SupportTicket';

export interface SupportTicketMessageAttributes {
  id: number;
  ticket_id: number;
  sender_type: 'CUSTOMER' | 'ADMIN' | 'SYSTEM';
  sender_id?: number | null;
  message: string;
  created_at: Date;
  updated_at: Date;
}

export interface SupportTicketMessageCreationAttributes extends Optional<SupportTicketMessageAttributes, 'id' | 'created_at' | 'updated_at'> {}

class SupportTicketMessage extends Model<SupportTicketMessageAttributes, SupportTicketMessageCreationAttributes> implements SupportTicketMessageAttributes {
  public id!: number;
  public ticket_id!: number;
  public sender_type!: 'CUSTOMER' | 'ADMIN' | 'SYSTEM';
  public sender_id?: number | null;
  public message!: string;
  public created_at!: Date;
  public updated_at!: Date;

  // Associations
  public readonly ticket?: SupportTicket;
}

SupportTicketMessage.init({
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
  },
  sender_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  sender_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
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
}, {
  sequelize,
  modelName: 'SupportTicketMessage',
  tableName: 'support_ticket_messages',
  timestamps: false,
});

// Define associations
SupportTicketMessage.belongsTo(SupportTicket, { foreignKey: 'ticket_id', as: 'ticket' });

export default SupportTicketMessage; 
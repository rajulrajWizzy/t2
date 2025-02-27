// models/seatingType.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const SeatingType = sequelize.define('SeatingType', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.ENUM,
    values: ['HOT_DESK', 'DEDICATED_DESK', 'CUBICLE', 'MEETING_ROOM', 'DAILY_PASS'],
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  hourly_rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  is_hourly: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  min_booking_duration: {
    type: DataTypes.INTEGER, // hours
    allowNull: false,
    defaultValue: 2
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'seating_types',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default SeatingType;
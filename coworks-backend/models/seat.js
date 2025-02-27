// models/seat.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Seat = sequelize.define('Seat', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'branches',
      key: 'id'
    }
  },
  seating_type_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'seating_types',
      key: 'id'
    }
  },
  seat_number: {
    type: DataTypes.STRING,
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  availability_status: {
    type: DataTypes.ENUM,
    values: ['AVAILABLE', 'BOOKED', 'MAINTENANCE'],
    defaultValue: 'AVAILABLE'
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
  tableName: 'seats',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default Seat;

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';
import { SeatingType, SeatingTypeAttributes, SeatingTypeEnum } from '@/types/seating';

// Interface for creation attributes
interface SeatingTypeCreationAttributes extends Optional<SeatingTypeAttributes, 'id' | 'created_at' | 'updated_at'> {}

// Define the SeatingType model
class SeatingTypeModel extends Model<SeatingType, SeatingTypeCreationAttributes> implements SeatingType {
  public id!: number;
  public name!: SeatingTypeEnum;
  public description!: string | null;
  public hourly_rate!: number;
  public is_hourly!: boolean;
  public min_booking_duration!: number;
  public created_at!: Date;
  public updated_at!: Date;

  // Add any instance methods here
}

SeatingTypeModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.ENUM(...Object.values(SeatingTypeEnum)),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    hourly_rate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    is_hourly: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    min_booking_duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
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
    tableName: 'seating_types',
    sequelize,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default SeatingTypeModel;
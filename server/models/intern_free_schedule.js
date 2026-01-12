// models/intern_free_schedule.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const InternFreeSchedule = sequelize.define('InternFreeSchedule', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  internId: { type: DataTypes.INTEGER, allowNull: false },
  week: { type: DataTypes.STRING, allowNull: false },
  schedule: { type: DataTypes.TEXT, allowNull: false }, // JSON string
}, {
  tableName: 'intern_free_schedule',
  timestamps: false
});

module.exports = InternFreeSchedule;

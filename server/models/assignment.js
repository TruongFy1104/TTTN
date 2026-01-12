// models/assignment.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Assignment = sequelize.define('Assignment', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  internId: { type: DataTypes.INTEGER, allowNull: false },
  schoolId: { type: DataTypes.INTEGER, allowNull: false },
  week: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: 'assigned' }, // assigned, completed, cancelled
  notes: { type: DataTypes.TEXT }
}, {
  tableName: 'assignments',
  timestamps: true
});

module.exports = Assignment;

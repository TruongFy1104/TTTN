// models/school.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const School = sequelize.define('School', {
	id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
	schoolName: { type: DataTypes.STRING, allowNull: false },
	schoolLevel: { type: DataTypes.STRING, allowNull: false },
	address: { type: DataTypes.STRING, allowNull: false },
	area: { type: DataTypes.STRING },
	lat: { type: DataTypes.DECIMAL(10, 8) },
	lng: { type: DataTypes.DECIMAL(11, 8) }
}, {
	tableName: 'schools',
	timestamps: false
});

module.exports = School;
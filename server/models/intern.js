// models/intern.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Intern = sequelize.define('Intern', {
	id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
	fullName: { type: DataTypes.STRING, allowNull: false },
	phoneNumber: { type: DataTypes.STRING, allowNull: false },
	address: { type: DataTypes.STRING, allowNull: false },
	lat: { type: DataTypes.DECIMAL(10, 8) },
	lng: { type: DataTypes.DECIMAL(11, 8) }
}, {
	tableName: 'interns',
	timestamps: false
});

module.exports = Intern;
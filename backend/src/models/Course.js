const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Course = sequelize.define('Course', {
  name: { type: DataTypes.STRING, allowNull: false },
  facultyId: { type: DataTypes.INTEGER, allowNull: false } 
});

Course.associate = (models) => {
  Course.belongsTo(models.Faculty, { foreignKey: 'facultyId' });
};

module.exports = Course;
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Faculty = sequelize.define('Faculty', {
  name: { type: DataTypes.STRING, allowNull: false }
});

Faculty.associate = (models) => {
  Faculty.hasMany(models.Course, { foreignKey: 'facultyId' });
};

module.exports = Faculty;
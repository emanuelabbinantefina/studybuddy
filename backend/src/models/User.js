const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // Punta al db.js che mi hai appena mostrato

const User = sequelize.define('User', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  facolta: {
    type: DataTypes.STRING,
    allowNull: true
  },
  corso: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

module.exports = User;
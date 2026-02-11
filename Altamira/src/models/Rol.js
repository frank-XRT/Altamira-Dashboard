const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Rol = sequelize.define('Rol', {
    id_rol: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    descripcion: {
        type: DataTypes.STRING(255),
        allowNull: false
    }
}, {
    tableName: 'rol',
    timestamps: false
});

module.exports = Rol;

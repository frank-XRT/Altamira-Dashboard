const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Usuario = sequelize.define('Usuario', {
    id_usuario: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_rol: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    telefono: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    activo: {
        type: DataTypes.TINYINT(1),
        defaultValue: 1
    }
}, {
    tableName: 'usuario',
    timestamps: false
});

module.exports = Usuario;

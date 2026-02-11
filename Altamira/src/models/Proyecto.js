const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Proyecto = sequelize.define('Proyecto', {
    id_proyecto: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    estado: {
        type: DataTypes.ENUM('ACTIVO', 'NO ACTIVO'),
        defaultValue: 'ACTIVO'
    },
    imagen_mapa: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    imagen_plano: {
        type: DataTypes.STRING(255),
        allowNull: true
    }
}, {
    tableName: 'proyecto',
    timestamps: false
});

module.exports = Proyecto;

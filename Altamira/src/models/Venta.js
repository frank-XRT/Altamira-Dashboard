const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Venta = sequelize.define('Venta', {
    id_venta: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    precio_final: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true
    },
    inicial: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true
    },
    mensualidad: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true
    },
    plazo_meses: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    fecha_venta: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    id_cliente: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_lote: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_usuario: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_cotizaciones: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    fecha_registro: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'venta',
    timestamps: false
});

module.exports = Venta;

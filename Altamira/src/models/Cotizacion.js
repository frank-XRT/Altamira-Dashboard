const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Cotizacion = sequelize.define('Cotizacion', {
    id_cotizaciones: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    precio_base: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true
    },
    descuento: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true
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
    id_cliente: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_usuario: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_lote: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    fecha_creacion: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'cotizacion',
    timestamps: false
});

module.exports = Cotizacion;

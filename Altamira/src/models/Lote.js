const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Lote = sequelize.define('Lote', {
    id_lote: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    manzana: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    numero: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    area: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    precio_contado: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true
    },
    precio_financiado: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true
    },
    precio_oferta: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true
    },
    coordenada_x: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true
    },
    coordenada_y: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true
    },
    ubicacion: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: 'calle'
    },
    id_proyecto: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_estado_lote: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    geojson: {
        type: DataTypes.TEXT, // Storing GeoJSON as text
        allowNull: true
    }
}, {
    tableName: 'lote',
    timestamps: true
});

module.exports = Lote;

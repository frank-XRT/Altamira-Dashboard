const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EstadoLote = sequelize.define('EstadoLote', {
    id_estado_lote: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre_estado: {
        type: DataTypes.STRING(50),
        allowNull: true
    }
}, {
    tableName: 'estado_lote',
    timestamps: false
});

module.exports = EstadoLote;

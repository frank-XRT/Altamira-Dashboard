const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Cliente = sequelize.define('Cliente', {
    id_cliente: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    documento: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    telefono: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    apellidos: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    comentarios: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    estado_contacto: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: 'PENDIENTE'
    },
    fecha_reagendado: {
        type: DataTypes.DATE, // Storing full timestamp
        allowNull: true
    },
    fecha_registro: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    id_usuario: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'usuario',
            key: 'id_usuario'
        }
    }
}, {
    tableName: 'cliente',
    timestamps: false
});

module.exports = Cliente;

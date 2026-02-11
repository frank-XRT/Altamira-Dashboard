const sequelize = require('../config/database');
const Rol = require('./Rol');
const Usuario = require('./Usuario');
const Cliente = require('./Cliente');
const Proyecto = require('./Proyecto');
const EstadoLote = require('./EstadoLote');
const Lote = require('./Lote');
const Cotizacion = require('./Cotizacion');
const Venta = require('./Venta');

// Associations

// Usuario - Rol
Rol.hasMany(Usuario, { foreignKey: 'id_rol' });
Usuario.belongsTo(Rol, { foreignKey: 'id_rol' });

// Usuario - Cliente
Usuario.hasMany(Cliente, { foreignKey: 'id_usuario' });
Cliente.belongsTo(Usuario, { foreignKey: 'id_usuario' });

// Lote - Proyecto
Proyecto.hasMany(Lote, { foreignKey: 'id_proyecto' });
Lote.belongsTo(Proyecto, { foreignKey: 'id_proyecto' });

// Lote - EstadoLote
EstadoLote.hasMany(Lote, { foreignKey: 'id_estado_lote' });
Lote.belongsTo(EstadoLote, { foreignKey: 'id_estado_lote' });

// Cotizacion - Cliente
Cliente.hasMany(Cotizacion, { foreignKey: 'id_cliente' });
Cotizacion.belongsTo(Cliente, { foreignKey: 'id_cliente' });

// Cotizacion - Usuario
Usuario.hasMany(Cotizacion, { foreignKey: 'id_usuario' });
Cotizacion.belongsTo(Usuario, { foreignKey: 'id_usuario' });

// Cotizacion - Lote
Lote.hasMany(Cotizacion, { foreignKey: 'id_lote' });
Cotizacion.belongsTo(Lote, { foreignKey: 'id_lote' });

// Venta - Cliente
Cliente.hasMany(Venta, { foreignKey: 'id_cliente' });
Venta.belongsTo(Cliente, { foreignKey: 'id_cliente' });

// Venta - Lote
Lote.hasOne(Venta, { foreignKey: 'id_lote' });
Venta.belongsTo(Lote, { foreignKey: 'id_lote' });

// Venta - Usuario
Usuario.hasMany(Venta, { foreignKey: 'id_usuario' });
Venta.belongsTo(Usuario, { foreignKey: 'id_usuario' });

// Venta - Cotizacion
Cotizacion.hasOne(Venta, { foreignKey: 'id_cotizaciones' });
Venta.belongsTo(Cotizacion, { foreignKey: 'id_cotizaciones' });

module.exports = {
    sequelize,
    Rol,
    Usuario,
    Cliente,
    Proyecto,
    EstadoLote,
    Lote,
    Cotizacion,
    Venta
};

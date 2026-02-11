const sequelize = require('../src/config/database');

async function addColumns() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // 1. Add fecha_creacion to cotizacion
        try {
            await sequelize.query("ALTER TABLE cotizacion ADD COLUMN fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP;");
            console.log('Added fecha_creacion to cotizacion');
        } catch (e) {
            console.log('Column fecha_creacion might already exist in cotizacion or error:', e.message);
        }

        // 2. Add fecha_registro to venta (to be distinct from fecha_venta if user had issues with it)
        try {
            await sequelize.query("ALTER TABLE venta ADD COLUMN fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP;");
            console.log('Added fecha_registro to venta');
        } catch (e) {
            console.log('Column fecha_registro might already exist in venta or error:', e.message);
        }

        console.log('Done.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

addColumns();

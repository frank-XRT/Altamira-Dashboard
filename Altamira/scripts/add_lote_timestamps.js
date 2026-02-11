const sequelize = require('../src/config/database');

async function upgradeLote() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Add updatedAt to Lote
        try {
            // Check if column exists or just try add
            await sequelize.query("ALTER TABLE lote ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;");
            console.log('Added updatedAt to lote');
        } catch (e) {
            console.log('Column updatedAt might already exist in lote or error:', e.message);
        }

        // Also add createdAt for good measure if we want it later
        try {
            await sequelize.query("ALTER TABLE lote ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP;");
            console.log('Added createdAt to lote');
        } catch (e) {
            console.log('Column createdAt might already exist or error:', e.message);
        }

        console.log('Done.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

upgradeLote();

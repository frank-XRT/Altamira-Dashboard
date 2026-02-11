const { sequelize, Rol, EstadoLote, Usuario, Cliente } = require('./models');
const bcrypt = require('bcryptjs');

const seed = async () => {
    try {
        await sequelize.sync({ force: true }); // WARNING: This clears the DB

        console.log('Database synced.');

        // Roles
        const adminRole = await Rol.create({ nombre: 'Administrador', descripcion: 'System Administrator' });
        const asesorRole = await Rol.create({ nombre: 'Asesor', descripcion: 'Sales Advisor' });

        // Lot Statuses
        await EstadoLote.bulkCreate([
            { nombre_estado: 'DISPONIBLE' },
            { nombre_estado: 'RESERVADO' },
            { nombre_estado: 'VENDIDO' }
        ]);

        // Client
        await Cliente.create({
            nombre: 'Cliente General',
            documento: '00000000',
            telefono: '999999999',
            email: 'cliente@ejemplo.com'
        });

        // Admin User
        const hashedPassword = await bcrypt.hash('123456', 10);
        await Usuario.create({
            nombre: 'Admin Famia',
            email: 'admin@famia.com',
            password: hashedPassword,
            id_rol: adminRole.id_rol,
            activo: true
        });

        // Asesor User
        await Usuario.create({
            nombre: 'Asesor Ventas',
            email: 'asesor@famia.com',
            password: hashedPassword,
            id_rol: asesorRole.id_rol,
            activo: true
        });

        console.log('Database seeded successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seed();

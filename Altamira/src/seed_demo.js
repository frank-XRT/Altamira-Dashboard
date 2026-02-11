const { sequelize, Proyecto, Lote, EstadoLote } = require('./models');

const seedDemo = async () => {
    try {
        // Don't force sync, just add data
        await sequelize.sync();

        console.log('Connected to DB. Generating demo data...');

        // Get Status IDs
        const available = await EstadoLote.findOne({ where: { nombre_estado: 'DISPONIBLE' } });
        const reserved = await EstadoLote.findOne({ where: { nombre_estado: 'RESERVADO' } });
        const sold = await EstadoLote.findOne({ where: { nombre_estado: 'VENDIDO' } });

        const statuses = [available, reserved, sold];

        // Projects
        const projectsData = [
            { nombre: 'Residencial Los Álamos', imagen_mapa: 'https://via.placeholder.com/800x600?text=Mapa+Los+Alamos' },
            { nombre: 'Villa El Sol', imagen_mapa: 'https://via.placeholder.com/800x600?text=Mapa+Villa+El+Sol' }
        ];

        for (const pData of projectsData) {
            const project = await Proyecto.create(pData);
            console.log(`Created Project: ${project.nombre}`);

            const lots = [];
            // Generate 60 lots
            // Grid layout: 6 rows (Mz A-F) x 10 cols
            const manzanas = ['A', 'B', 'C', 'D', 'E', 'F'];

            for (let m = 0; m < manzanas.length; m++) {
                for (let n = 1; n <= 10; n++) {
                    // Random Status (80% Available, 10% Reserved, 10% Sold)
                    const rand = Math.random();
                    let statusId = available.id_estado_lote;
                    if (rand > 0.8) statusId = reserved.id_estado_lote;
                    if (rand > 0.9) statusId = sold.id_estado_lote;

                    lots.push({
                        manzana: manzanas[m],
                        numero: n,
                        area: Math.floor(Math.random() * (200 - 90) + 90), // 90-200 m2
                        precio_base: Math.floor(Math.random() * (50000 - 25000) + 25000), // 25k-50k
                        coordenada_x: (n * 9), // Roughly distributed horizontally
                        coordenada_y: (m * 15) + 10, // Roughly distributed vertically
                        id_proyecto: project.id_proyecto,
                        id_estado_lote: statusId
                    });
                }
            }

            await Lote.bulkCreate(lots);
            console.log(`Added ${lots.length} lots to ${project.nombre}`);
        }

        console.log('Demo data generated successfully.');
        process.exit(0);

    } catch (error) {
        console.error('Error generating demo data:', error);
        process.exit(1);
    }
};

seedDemo();

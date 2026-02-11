const { Lote, EstadoLote } = require('../models');
const xlsx = require('xlsx');

exports.uploadLotsExcel = async (req, res) => {
    try {
        const { id_proyecto } = req.body;
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
        if (!id_proyecto) return res.status(400).json({ message: 'Project ID is required' });

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        // Fetch all possible states for mapping
        const allStates = await EstadoLote.findAll();
        const stateMap = {};
        allStates.forEach(s => {
            stateMap[s.nombre_estado.toUpperCase()] = s.id_estado_lote;
        });

        let updatedCount = 0;
        let skippedCount = 0;
        let errors = [];

        for (const row of data) {
            // Helper to get value loosely (case insensitive keys)
            const getValue = (keyPattern) => {
                const key = Object.keys(row).find(k => k.match(new RegExp(keyPattern, 'i')));
                return key ? row[key] : undefined;
            };

            const mz = getValue('Manzana');
            let num = getValue('Numero|Lote'); // Matches 'Numero', 'Numero de lote', 'Lote'
            const areaRaw = getValue('Area');
            const contadoRaw = getValue('Contado') || getValue('Precio');
            const financiadoRaw = getValue('Financiado');
            const ofertaRaw = getValue('Oferta');
            const ubicacionRaw = getValue('Ubicacion');
            const estadoRaw = getValue('Estado');

            if (!mz || !num) {
                // errors.push(`Row missing Manzana or Numero: ${JSON.stringify(row)}`);
                continue;
            }

            // Clean Data
            if (typeof num === 'string') {
                // Extract first number found? Or just parse. "Lote 05" -> 5
                const match = num.match(/\d+/);
                if (match) num = parseInt(match[0]);
            }

            const cleanNumber = (val) => {
                if (typeof val === 'number') return val;
                if (!val) return null;
                // Remove currency symbols (S/ $ etc) and commas if used as thousand separator (simplistic approach)
                let s = val.toString().replace(/[^\d.-]/g, '');
                return parseFloat(s);
            };

            const area = cleanNumber(areaRaw);
            const precioContado = cleanNumber(contadoRaw);
            const precioFinanciado = cleanNumber(financiadoRaw);
            const precioOferta = cleanNumber(ofertaRaw);
            const ubicacion = ubicacionRaw ? ubicacionRaw.toString().trim().toLowerCase() : null;
            const targetStateId = estadoRaw ? stateMap[estadoRaw.toString().toUpperCase()] : null;

            // Find Lote
            const lote = await Lote.findOne({
                where: {
                    manzana: mz.toString(),
                    numero: num,
                    id_proyecto: id_proyecto
                }
            });

            if (lote) {
                let needsUpdate = false;
                const changes = {};

                // Float comparison tolerance
                const diff = (a, b) => Math.abs(parseFloat(a || 0) - parseFloat(b || 0)) > 0.01;

                if (area !== null && diff(lote.area, area)) {
                    changes.area = area;
                    needsUpdate = true;
                }

                if (precioContado !== null && diff(lote.precio_contado, precioContado)) {
                    changes.precio_contado = precioContado;
                    needsUpdate = true;
                }

                if (precioFinanciado !== null && diff(lote.precio_financiado, precioFinanciado)) {
                    changes.precio_financiado = precioFinanciado;
                    needsUpdate = true;
                }

                if (precioOferta !== null && diff(lote.precio_oferta, precioOferta)) {
                    changes.precio_oferta = precioOferta;
                    needsUpdate = true;
                }

                if (ubicacion && lote.ubicacion !== ubicacion) {
                    changes.ubicacion = ubicacion;
                    needsUpdate = true;
                }

                if (targetStateId && lote.id_estado_lote !== targetStateId) {
                    changes.id_estado_lote = targetStateId;
                    needsUpdate = true;
                }

                if (needsUpdate) {
                    await lote.update(changes);
                    updatedCount++;
                } else {
                    skippedCount++;
                }
            } else {
                errors.push(`Lote no encontrado: Mz ${mz} Lote ${num}`);
            }
        }

        res.json({
            message: 'Proceso de carga completado',
            updated: updatedCount,
            skipped: skippedCount,
            errorsCount: errors.length,
            errors: errors.slice(0, 50) // Return first 50 errors
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error procesando Excel', error: e.message });
    }
};

exports.createLot = async (req, res) => {
    try {
        const { id_estado_lote } = req.body;

        // Check if creating as ESPACIO PUBLICO
        if (id_estado_lote) {
            const publicState = await EstadoLote.findOne({ where: { nombre_estado: 'ESPACIO PUBLICO' } });
            if (publicState && parseInt(id_estado_lote) === publicState.id_estado_lote) {
                req.body.precio_contado = null;
                req.body.precio_financiado = null;
                req.body.precio_oferta = null;
            }
        }

        const lot = await Lote.create(req.body);
        res.status(201).json(lot);
    } catch (error) {
        res.status(500).json({ message: 'Error creating lot', error: error.message });
    }
};

exports.updateLot = async (req, res) => {
    try {
        const { id } = req.params;
        let updateData = { ...req.body };

        const currentLot = await Lote.findByPk(id);
        if (!currentLot) return res.status(404).json({ message: 'Lot not found' });

        const publicState = await EstadoLote.findOne({ where: { nombre_estado: 'ESPACIO PUBLICO' } });

        if (publicState) {
            const targetStateId = updateData.id_estado_lote !== undefined ? updateData.id_estado_lote : currentLot.id_estado_lote;

            if (parseInt(targetStateId) === publicState.id_estado_lote) {
                // Force prices to null if state is ESPACIO PUBLICO
                updateData.precio_contado = null;
                updateData.precio_financiado = null;
                updateData.precio_oferta = null;
            }
        }

        await Lote.update(updateData, { where: { id_lote: id } });
        res.json({ message: 'Lot updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating lot', error: error.message });
    }
};

exports.deleteLot = async (req, res) => {
    try {
        const { id } = req.params;
        await Lote.destroy({ where: { id_lote: id } });
        res.json({ message: 'Lot deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting lot', error: error.message });
    }
};

exports.getLotById = async (req, res) => {
    try {
        const { id } = req.params;
        const lot = await Lote.findByPk(id, { include: [EstadoLote] });
        if (!lot) return res.status(404).json({ message: 'Lot not found' });
        res.json(lot);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving lot', error: error.message });
    }
};

exports.getLotStates = async (req, res) => {
    try {
        const states = await EstadoLote.findAll();
        res.json(states);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving states', error: error.message });
    }
};

exports.getLots = async (req, res) => {
    try {
        const lots = await Lote.findAll({
            include: [EstadoLote]
        });

        const features = lots.map(lot => {
            let geometry = null;
            try {
                if (lot.geojson) {
                    geometry = JSON.parse(lot.geojson);
                }
            } catch (e) {
                console.error('Error parsing geojson for lot ' + lot.id_lote, e);
            }

            if (!geometry) return null;

            // Lógica para zonas públicas (override)
            const publicZones = [
                { m: 'B', n: 1, label: 'Parque' },
                { m: 'B', n: 2, label: 'Club House' },
                { m: 'C', n: 4, label: 'Juegos infantiles' },
                { m: 'C', n: 5, label: 'Deportes' },
                { m: 'A', n: 23, label: 'Educacion' },
                { m: 'A', n: 29, label: 'Otros fines' }
            ];

            const isPublic = publicZones.find(z => z.m === lot.manzana && z.n === lot.numero);

            const isSold = lot.EstadoLote && lot.EstadoLote.nombre_estado === 'VENDIDO';
            const isPublicSpace = lot.EstadoLote && lot.EstadoLote.nombre_estado === 'ESPACIO PUBLICO';

            const precioFormatted = (isPublic || isSold || isPublicSpace)
                ? ''
                : new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(lot.precio_contado);

            const areaFormatted = `${Math.round(lot.area * 100) / 100} m²`;
            const estadoFinal = isPublic ? 'ZONA PUBLICA' : (lot.EstadoLote ? lot.EstadoLote.nombre_estado : 'DISPONIBLE');
            const nota = isPublic ? isPublic.label : '';

            return {
                type: 'Feature',
                properties: {
                    lote: lot.numero,
                    manzana: lot.manzana,
                    area: areaFormatted,
                    precio: precioFormatted,
                    estado: estadoFinal,
                    nota: nota,
                    _dbId: lot.id_lote,
                    id_proyecto: lot.id_proyecto
                },
                geometry: geometry
            };
        }).filter(f => f !== null);

        res.json({
            type: 'FeatureCollection',
            features: features
        });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving lots', error: error.message });
    }
};

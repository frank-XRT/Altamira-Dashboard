const { Venta, Lote, EstadoLote, Cliente, Usuario, Proyecto } = require('../models');

exports.createSale = async (req, res) => {
    const t = await Venta.sequelize.transaction();
    try {
        const { precio_final, inicial, mensualidad, plazo_meses, id_cliente, id_lote, id_cotizaciones } = req.body;
        const id_usuario = req.user.id;

        // Create Sale
        const sale = await Venta.create({
            precio_final,
            inicial,
            mensualidad,
            plazo_meses,
            id_cliente,
            id_lote,
            id_usuario,
            id_cotizaciones
        }, { transaction: t });

        // Update Lot Status to VENDIDO
        const soldState = await EstadoLote.findOne({ where: { nombre_estado: 'VENDIDO' } });
        // NOTE: In real app, make sure 'VENDIDO' exists or seeded. If not, maybe use ID depending on seeds.

        if (soldState) {
            await Lote.update({ id_estado_lote: soldState.id_estado_lote }, {
                where: { id_lote },
                transaction: t
            });
        }

        await t.commit();
        res.status(201).json(sale);
    } catch (error) {
        await t.rollback();
        res.status(500).json({ message: 'Error creating sale', error: error.message });
    }
};

exports.getAllSales = async (req, res) => {
    try {
        const sales = await Venta.findAll({
            include: [
                { model: Cliente },
                {
                    model: Lote,
                    include: [Proyecto]
                },
                { model: Usuario }
            ],
            order: [['fecha_registro', 'DESC']]
        });

        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving sales', error: error.message });
    }
};

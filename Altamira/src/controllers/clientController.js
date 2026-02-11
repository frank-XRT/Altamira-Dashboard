const { Cliente, Usuario } = require('../models');

exports.getAllClients = async (req, res) => {
    try {
        const { role, id } = req.user;
        let query = {
            include: [{ model: Usuario, attributes: ['nombre', 'id_usuario'] }]
        };

        // If not Administrator, show only own clients
        if (role !== 'Administrador') {
            query.where = { id_usuario: id };
        }

        const clients = await Cliente.findAll(query);
        res.json(clients);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving clients', error: error.message });
    }
};

exports.createClient = async (req, res) => {
    try {
        const { id } = req.user;
        const newClientData = { ...req.body, id_usuario: id }; // Assign Creator

        const client = await Cliente.create(newClientData);
        res.status(201).json(client);
    } catch (error) {
        res.status(500).json({ message: 'Error creating client', error: error.message });
    }
};

exports.updateClient = async (req, res) => {
    try {
        const { id } = req.params;
        // Explicitly allowed fields for update including new contact status
        const { nombre, apellidos, documento, telefono, email, comentarios, estado_contacto, fecha_reagendado } = req.body;

        await Cliente.update({
            nombre, apellidos, documento, telefono, email, comentarios, estado_contacto, fecha_reagendado
        }, { where: { id_cliente: id } });

        res.json({ message: 'Client updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating client', error: error.message });
    }
};

exports.deleteClient = async (req, res) => {
    try {
        const { id } = req.params;
        await Cliente.destroy({ where: { id_cliente: id } });
        res.json({ message: 'Client deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting client', error: error.message });
    }
};

exports.assignClients = async (req, res) => {
    try {
        const { clientIds, advisorId } = req.body;

        if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
            return res.status(400).json({ message: 'Debe seleccionar al menos un cliente.' });
        }

        if (!advisorId) {
            return res.status(400).json({ message: 'Debe seleccionar un asesor.' });
        }

        await Cliente.update(
            { id_usuario: advisorId },
            { where: { id_cliente: clientIds } }
        );

        res.json({ message: 'Clientes asignados correctamente.' });
    } catch (error) {
        res.status(500).json({ message: 'Error asignando clientes', error: error.message });
    }
};

exports.registerPublicClient = async (req, res) => {
    try {
        const { nombres, apellidos, email, telefono, comentarios } = req.body;

        // --- SECURITY & VALIDATION MEASURES ---

        // 1. Basic Field Validation
        if (!nombres || !apellidos || !email || !telefono) {
            return res.status(400).json({ message: 'Todos los campos obligatorios son requeridos.' });
        }

        // 2. Phone Validation (Peru Format)
        // Must be exactly 9 digits and start with 9
        const phoneRegex = /^9\d{8}$/;
        if (!phoneRegex.test(telefono)) {
            return res.status(400).json({ message: 'El teléfono debe tener 9 dígitos y empezar con 9.' });
        }

        // Check for repetitive digits (e.g. 999999999) - catches 999999999
        if (/^(\d)\1{8}$/.test(telefono)) {
            return res.status(400).json({ message: 'Número de teléfono inválido (dígitos repetidos).' });
        }

        // Check for sequential digits (common fake inputs)
        const sequentialAsc = '123456789';
        const sequentialDesc = '987654321';
        if (telefono === sequentialAsc || telefono === sequentialDesc) {
            return res.status(400).json({ message: 'Número de teléfono inválido (secuencia común).' });
        }

        // 3. Email Validation (Basic Format)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Formato de correo electrónico inválido.' });
        }

        // 4. Comment Length Validation
        if (comentarios && comentarios.length > 300) {
            return res.status(400).json({ message: 'El comentario no puede exceder los 300 caracteres.' });
        }

        // --- END SECURITY ---

        const newClient = await Cliente.create({
            nombre: nombres,
            apellidos,
            email,
            telefono,
            comentarios
            // id_usuario is NULL (Unassigned)
        });

        res.status(201).json({ message: 'Datos recibidos correctamente.', client: newClient });
    } catch (error) {
        console.error('Error registering public client:', error);
        res.status(500).json({ message: 'Error interno al procesar la solicitud.', error: error.message });
    }
};

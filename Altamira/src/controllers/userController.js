const { Usuario, Rol } = require('../models');
const bcrypt = require('bcryptjs');

exports.getAllUsers = async (req, res) => {
    try {
        const users = await Usuario.findAll({
            include: [{ model: Rol }],
            attributes: { exclude: ['password'] } // Don't send passwords back
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { nombre, email, telefono, password, id_rol, activo } = req.body;

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await Usuario.create({
            nombre,
            email,
            telefono,
            password: hashedPassword,
            id_rol,
            activo: activo !== undefined ? activo : 1
        });

        res.status(201).json({ message: 'User created' });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, email, telefono, password, id_rol, activo } = req.body;

        const updateData = { nombre, email, telefono, id_rol, activo };

        // Only update password if provided
        if (password && password.trim() !== '') {
            updateData.password = await bcrypt.hash(password, 10);
        }

        await Usuario.update(updateData, { where: { id_usuario: id } });
        res.json({ message: 'User updated' });

    } catch (error) {
        res.status(500).json({ message: 'Error updating user', error: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const targetUser = await Usuario.findByPk(id, { include: [Rol] });

        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Rule 1: "Admin Famia" cannot be deleted by anyone (protected super admin).
        if (targetUser.nombre === 'Admin Famia') {
            return res.status(403).json({ message: 'No se puede eliminar al Administrador Principal.' });
        }

        // Rule 2: Only "Admin Famia" can delete other "Administradores".
        // Req.user contains { id, role, name } from the token.
        const currentUser = req.user;
        const targetIsAdmin = targetUser.Rol && targetUser.Rol.nombre === 'Administrador';
        const currentIsSuperAdmin = currentUser.name === 'Admin Famia';

        if (targetIsAdmin && !currentIsSuperAdmin) {
            return res.status(403).json({ message: 'Solo Admin Famia puede eliminar a otros administradores.' });
        }

        await Usuario.destroy({ where: { id_usuario: id } });
        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user', error: error.message });
    }
};

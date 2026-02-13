const { Proyecto, Lote, EstadoLote, sequelize } = require('../models');

exports.getAllProjects = async (req, res) => {
    try {
        console.log('API: getAllProjects called');

        let whereClause = {};
        // If user is NOT Admin (or not logged in), only show ACTIVO projects
        const userRole = req.user ? (req.user.role || '') : '';
        if (userRole.toLowerCase() !== 'administrador') {
            whereClause.estado = 'ACTIVO';
        }

        const count = await Proyecto.count({ where: whereClause });
        console.log(`DB: Found ${count} projects in counts`);

        const projects = await Proyecto.findAll({ where: whereClause });
        console.log(`DB: Returned ${projects.length} projects from findAll`);
        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving projects', error: error.message });
    }
};

exports.getProjectById = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await Proyecto.findByPk(id, {
            include: [{
                model: Lote,
                include: [EstadoLote]
            }]
        });

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check visibility for non-admins (or not logged in)
        const userRole = req.user ? (req.user.role || '') : '';
        if (userRole.toLowerCase() !== 'administrador' && project.estado !== 'ACTIVO') {
            return res.status(403).json({ message: 'Access denied: Project is not active' });
        }

        res.json(project);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving project', error: error.message });
    }
};

exports.createProject = async (req, res) => {
    try {
        const project = await Proyecto.create(req.body);
        res.status(201).json(project);
    } catch (error) {
        res.status(500).json({ message: 'Error creating project', error: error.message });
    }
};

exports.updateProjectStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        await Proyecto.update({ estado }, { where: { id_proyecto: id } });
        res.json({ message: 'Project status updated' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating project', error: error.message });
    }
};

exports.updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, imagen_mapa } = req.body; // Allow updating name and map image

        const project = await Proyecto.findByPk(id);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (nombre) project.nombre = nombre;
        if (imagen_mapa !== undefined) project.imagen_mapa = imagen_mapa;

        await project.save();
        res.json(project);
    } catch (error) {
        res.status(500).json({ message: 'Error updating project', error: error.message });
    }
};

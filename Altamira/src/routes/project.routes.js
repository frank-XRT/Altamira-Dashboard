const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { verifyToken, verifyRole } = require('../middleware/auth');

router.get('/public', projectController.getAllProjects);
router.get('/public/:id', projectController.getProjectById);
router.get('/', verifyToken, projectController.getAllProjects);
router.get('/:id', verifyToken, projectController.getProjectById);
router.post('/', [verifyToken, verifyRole(['Administrador'])], projectController.createProject);
router.put('/:id/status', [verifyToken, verifyRole(['Administrador'])], projectController.updateProjectStatus);
router.put('/:id', [verifyToken, verifyRole(['Administrador'])], projectController.updateProject);

module.exports = router;

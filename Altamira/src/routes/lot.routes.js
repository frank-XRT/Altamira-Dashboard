const express = require('express');
const router = express.Router();
const lotController = require('../controllers/lotController');
const { verifyToken, verifyRole } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', [verifyToken, verifyRole(['Administrador']), upload.single('file')], lotController.uploadLotsExcel);
router.get('/states', lotController.getLotStates);
router.get('/', lotController.getLots);
router.post('/', [verifyToken, verifyRole(['Administrador'])], lotController.createLot);
router.put('/:id', [verifyToken, verifyRole(['Administrador'])], lotController.updateLot);
router.delete('/:id', [verifyToken, verifyRole(['Administrador'])], lotController.deleteLot);
router.get('/:id', verifyToken, lotController.getLotById);

module.exports = router;

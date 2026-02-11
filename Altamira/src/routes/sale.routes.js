const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const { verifyToken } = require('../middleware/auth');

router.post('/', verifyToken, saleController.createSale);
router.get('/', verifyToken, saleController.getAllSales);

module.exports = router;

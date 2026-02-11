const express = require('express');
const router = express.Router();
const quoteController = require('../controllers/quoteController');
const { verifyToken } = require('../middleware/auth');

router.post('/', verifyToken, quoteController.createQuote);
router.get('/', verifyToken, quoteController.getAllQuotes);
router.get('/:id/pdf', verifyToken, quoteController.getQuotePdf);
router.delete('/:id', verifyToken, quoteController.deleteQuote);
router.put('/:id', verifyToken, quoteController.updateQuote);

module.exports = router;

const express = require('express');
const router = express.Router();
const quoteController = require('../controllers/quoteController');
const { verifyToken, verifyQuoteAccess } = require('../middleware/auth');

router.post('/', verifyToken, quoteController.createQuote);
router.get('/', verifyToken, quoteController.getAllQuotes);

// New Share Token Route (Advisors Only)
router.post('/:id/share', verifyToken, quoteController.generateShareLink);

// PDF Access (Advisors OR Share Token)
// Added verifyQuoteAccess to prevent IDOR via share tokens
router.get('/:id/pdf', verifyToken, verifyQuoteAccess, quoteController.getQuotePdf);

router.delete('/:id', verifyToken, quoteController.deleteQuote);
router.put('/:id', verifyToken, quoteController.updateQuote);

module.exports = router;

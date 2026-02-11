const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, clientController.getAllClients);
router.post('/', verifyToken, clientController.createClient);
router.put('/:id', verifyToken, clientController.updateClient);
router.delete('/:id', verifyToken, clientController.deleteClient);
router.post('/assign', [verifyToken], clientController.assignClients);

const { publicContactLimiter } = require('../middleware/rateLimit');

// Public route for contact form with rate limit
router.post('/public', publicContactLimiter, clientController.registerPublicClient);

module.exports = router;

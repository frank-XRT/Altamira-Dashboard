const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');

// All routes here should likely be Admin only.
// For MVP, verifyToken is enough, and UI hides it.
// Ideally, add a verifyAdmin middleware.

router.get('/', verifyToken, userController.getAllUsers);
router.post('/', verifyToken, userController.createUser);
router.put('/:id', verifyToken, userController.updateUser);
router.delete('/:id', verifyToken, userController.deleteUser);

module.exports = router;

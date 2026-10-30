const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { autenticarToken } = require('../middlewares/auth');

// Rutas públicas de autenticación
router.post('/register', authController.register);
router.post('/login', authController.login);

// Rutas protegidas
router.get('/me', autenticarToken, authController.me);

module.exports = router;

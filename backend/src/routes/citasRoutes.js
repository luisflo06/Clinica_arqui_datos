const express = require('express');
const router = express.Router();
const citasController = require('../controllers/citasController');
const { autenticarToken, autorizarRoles } = require('../middlewares/auth');

// Consulta pública o autenticada de médicos y disponibilidad
router.get('/medicos', citasController.getMedicos);
router.get('/disponibilidad', citasController.getDisponibilidad);

// Rutas protegidas que requieren sesión activa
router.use(autenticarToken);

// Solicitar cita (Pacientes y Admins)
router.post('/solicitar', autorizarRoles('PACIENTE', 'ADMIN'), citasController.solicitarCita);

// Consultar citas del usuario en sesión
router.get('/mis-citas', citasController.getMisCitas);

module.exports = router;

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const citasRoutes = require('./routes/citasRoutes');

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Endpoint de verificación de salud
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    servicio: 'SaludDigital Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Enrutamiento modular
app.use('/api/auth', authRoutes);
app.use('/api/citas', citasRoutes);

// Manejador de rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    metodo: req.method,
    path: req.originalUrl
  });
});

// Manejador centralizado de errores (500)
app.use((err, req, res, next) => {
  console.error('Error global no controlado:', err);
  res.status(500).json({
    error: 'Error interno en el servidor',
    mensaje: err.message
  });
});

module.exports = app;

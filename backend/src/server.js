require('dotenv').config();
const app = require('./app');
const { pool, setMemoryMode } = require('./config/db');

const PORT = process.env.PORT || 5000;

async function startServer() {
  // Intentar probar conexión a PostgreSQL
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ [POSTGRESQL] Conexión establecida exitosamente:', res.rows[0].now);
  } catch (err) {
    console.warn('⚠️ [POSTGRESQL] No se pudo conectar al servidor local en puerto 5432.');
    console.warn('ℹ️ [MODO RESILIENTE] Activando almacén en memoria con datos semilla para pruebas continuas.');
    setMemoryMode(true);
  }

  app.listen(PORT, () => {
    console.log(`🏥 [SALUDDIGITAL] Servidor backend escuchando en http://localhost:${PORT}`);
    console.log(`📌 Documentación de contratos disponible en backend/docs/contratos-api.md`);
  });
}

startServer();

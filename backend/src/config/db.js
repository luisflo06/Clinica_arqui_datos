const { Pool } = require('pg');
require('dotenv').config();

// Pool de conexión a PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'saluddigital_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Almacén en memoria como fallback automático si no hay PostgreSQL activo localmente
class MemoryStore {
  constructor() {
    this.roles = [
      { id: 1, nombre: 'PACIENTE', descripcion: 'Usuario general' },
      { id: 2, nombre: 'MEDICO', descripcion: 'Profesional de la salud' },
      { id: 3, nombre: 'ADMIN', descripcion: 'Administrador clínico' }
    ];
    this.usuarios = [];
    this.medicos = [];
    this.citas = [];
    this._initSeed();
  }

  _initSeed() {
    const bcrypt = require('bcryptjs');
    const doctorPass = bcrypt.hashSync('Medico123*', 8);
    const adminPass = bcrypt.hashSync('Admin123*', 8);

    const docId = 'med-0001';
    const adminId = 'adm-0001';

    this.usuarios.push({
      id: docId,
      email: 'dr.garcia@saluddigital.com',
      password_hash: doctorPass,
      rol_id: 2,
      nombre: 'Carlos',
      apellido: 'García',
      telefono: '+525512345678',
      activo: true,
      created_at: new Date()
    });

    this.medicos.push({
      id: 'doc-reg-001',
      usuario_id: docId,
      nombre: 'Dr. Carlos García',
      especialidad: 'Medicina General',
      numero_licencia: 'MED-789012',
      horario_inicio: '08:00',
      horario_fin: '17:00',
      duracion_slot_minutos: 30,
      activo: true
    });

    this.usuarios.push({
      id: adminId,
      email: 'admin@saluddigital.com',
      password_hash: adminPass,
      rol_id: 3,
      nombre: 'Administración',
      apellido: 'Central',
      telefono: '+525599887766',
      activo: true,
      created_at: new Date()
    });
  }
}

const memoryStore = new MemoryStore();
let useMemoryFallback = false;

// Comprobación de estado de BD
async function query(text, params) {
  if (useMemoryFallback) {
    return null;
  }
  try {
    return await pool.query(text, params);
  } catch (err) {
    if (!useMemoryFallback && (err.code === 'ECONNREFUSED' || err.message.includes('connect'))) {
      console.warn('⚠️ [BACKEND] No se pudo conectar a PostgreSQL. Activando almacén en memoria para desarrollo continuo.');
      useMemoryFallback = true;
    }
    throw err;
  }
}

module.exports = {
  pool,
  query,
  memoryStore,
  get isMemoryMode() {
    return useMemoryFallback;
  },
  setMemoryMode(val) {
    useMemoryFallback = val;
  }
};

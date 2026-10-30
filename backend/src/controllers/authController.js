const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, isMemoryMode, memoryStore } = require('../config/db');
const { JWT_SECRET } = require('../middlewares/auth');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Registro de nuevos pacientes
 */
async function register(req, res) {
  try {
    const { email, password, nombre, apellido, telefono } = req.body;

    // 1. Validaciones de entrada
    if (!email || !password || !nombre || !apellido) {
      return res.status(400).json({
        error: 'Datos incompletos',
        mensaje: 'email, password, nombre y apellido son campos requeridos.'
      });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        error: 'Formato inválido',
        mensaje: 'El correo electrónico suministrado no cumple con un formato válido.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Contraseña débil',
        mensaje: 'La contraseña debe contener al menos 8 caracteres.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Modo Almacén en Memoria / Fallback
    if (isMemoryMode) {
      const existe = memoryStore.usuarios.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existe) {
        return res.status(409).json({
          error: 'Usuario existente',
          mensaje: 'Ya existe una cuenta registrada con este correo electrónico.'
        });
      }

      const nuevoUsuario = {
        id: `pac-${Date.now()}`,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        rol_id: 1, // PACIENTE
        nombre,
        apellido,
        telefono: telefono || null,
        activo: true,
        created_at: new Date()
      };
      memoryStore.usuarios.push(nuevoUsuario);

      const token = jwt.sign(
        { id: nuevoUsuario.id, email: nuevoUsuario.email, rol: 'PACIENTE', nombre, apellido },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.status(201).json({
        mensaje: 'Registro exitoso como Paciente',
        usuario: {
          id: nuevoUsuario.id,
          email: nuevoUsuario.email,
          nombre,
          apellido,
          rol: 'PACIENTE'
        },
        token
      });
    }

    // Modo PostgreSQL Real
    const checkEmail = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email.toLowerCase()]);
    if (checkEmail.rows.length > 0) {
      return res.status(409).json({
        error: 'Usuario existente',
        mensaje: 'Ya existe una cuenta registrada con este correo electrónico.'
      });
    }

    const queryInsert = `
      INSERT INTO usuarios (email, password_hash, rol_id, nombre, apellido, telefono)
      VALUES ($1, $2, (SELECT id FROM roles WHERE nombre = 'PACIENTE'), $3, $4, $5)
      RETURNING id, email, nombre, apellido, created_at;
    `;
    const result = await pool.query(queryInsert, [
      email.toLowerCase(),
      passwordHash,
      nombre,
      apellido,
      telefono || null
    ]);

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, rol: 'PACIENTE', nombre: user.nombre, apellido: user.apellido },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      mensaje: 'Registro exitoso como Paciente',
      usuario: { ...user, rol: 'PACIENTE' },
      token
    });

  } catch (error) {
    console.error('Error en register:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      mensaje: 'No fue posible completar el registro. Intente más tarde.'
    });
  }
}

/**
 * Inicio de sesión de usuarios (Paciente, Médico o Admin)
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Credenciales incompletas',
        mensaje: 'Debe ingresar email y contraseña.'
      });
    }

    // Modo Almacén en Memoria
    if (isMemoryMode) {
      const usuario = memoryStore.usuarios.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!usuario) {
        return res.status(401).json({
          error: 'Credenciales inválidas',
          mensaje: 'El correo electrónico o la contraseña son incorrectos.'
        });
      }

      const match = await bcrypt.compare(password, usuario.password_hash);
      if (!match) {
        return res.status(401).json({
          error: 'Credenciales inválidas',
          mensaje: 'El correo electrónico o la contraseña son incorrectos.'
        });
      }

      const rolNombre = memoryStore.roles.find(r => r.id === usuario.rol_id)?.nombre || 'PACIENTE';
      const token = jwt.sign(
        { id: usuario.id, email: usuario.email, rol: rolNombre, nombre: usuario.nombre, apellido: usuario.apellido },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.status(200).json({
        mensaje: 'Autenticación exitosa',
        usuario: {
          id: usuario.id,
          email: usuario.email,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          rol: rolNombre
        },
        token
      });
    }

    // Modo PostgreSQL Real
    const querySelect = `
      SELECT u.id, u.email, u.password_hash, u.nombre, u.apellido, u.activo, r.nombre AS rol
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      WHERE u.email = $1;
    `;
    const result = await pool.query(querySelect, [email.toLowerCase()]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        mensaje: 'El correo electrónico o la contraseña son incorrectos.'
      });
    }

    const usuario = result.rows[0];
    if (!usuario.activo) {
      return res.status(403).json({
        error: 'Cuenta desactivada',
        mensaje: 'Su cuenta se encuentra inactiva. Comuníquese con la administración.'
      });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        mensaje: 'El correo electrónico o la contraseña son incorrectos.'
      });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol, nombre: usuario.nombre, apellido: usuario.apellido },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      mensaje: 'Autenticación exitosa',
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rol: usuario.rol
      },
      token
    });

  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      mensaje: 'Ocurrió un error al procesar el inicio de sesión.'
    });
  }
}

/**
 * Consulta de perfil del usuario en sesión
 */
async function me(req, res) {
  return res.status(200).json({
    usuario: req.usuario
  });
}

module.exports = {
  register,
  login,
  me
};

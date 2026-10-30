const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secreto_salud_digital_2026_jwt_token_seguro';

/**
 * Middleware para validar el token JWT en las solicitudes
 */
function autenticarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({
      error: 'Acceso no autorizado',
      mensaje: 'Token de autenticación no proporcionado en el encabezado Authorization.'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        error: 'Token inválido o expirado',
        mensaje: 'La sesión no es válida. Inicie sesión nuevamente.'
      });
    }

    req.usuario = decoded;
    next();
  });
}

/**
 * Middleware para autorizar según rol ('PACIENTE', 'MEDICO', 'ADMIN')
 */
function autorizarRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        mensaje: `El rol '${req.usuario.rol}' no tiene autorización para realizar esta acción. Roles requeridos: ${rolesPermitidos.join(', ')}`
      });
    }

    next();
  };
}

module.exports = {
  autenticarToken,
  autorizarRoles,
  JWT_SECRET
};

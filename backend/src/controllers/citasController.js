const { pool, isMemoryMode, memoryStore } = require('../config/db');

/**
 * Consulta de disponibilidad de un médico para una fecha determinada
 * GET /api/citas/disponibilidad?medicoId=xxx&fecha=YYYY-MM-DD
 */
async function getDisponibilidad(req, res) {
  try {
    const { medicoId, fecha } = req.query;

    if (!medicoId || !fecha) {
      return res.status(400).json({
        error: 'Parámetros requeridos',
        mensaje: 'Debe especificar medicoId y fecha (formato YYYY-MM-DD).'
      });
    }

    // Modo Memoria / Fallback
    if (isMemoryMode) {
      const medico = memoryStore.medicos.find(m => m.id === medicoId || m.usuario_id === medicoId);
      if (!medico) {
        return res.status(404).json({ error: 'Médico no encontrado' });
      }

      // Generar slots de 30 minutos entre 08:00 y 17:00
      const slots = [];
      for (let h = 8; h < 17; h++) {
        for (let m of [0, 30]) {
          const horaStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
          const slotInicio = new Date(`${fecha}T${horaStr}Z`);
          const slotFin = new Date(slotInicio.getTime() + 30 * 60000);

          // Verificar si ya está ocupado en la BD en memoria
          const ocupado = memoryStore.citas.some(c => 
            c.medico_id === medico.id && 
            new Date(c.fecha_hora_inicio).getTime() === slotInicio.getTime() &&
            c.estado !== 'CANCELADA'
          );

          slots.push({
            hora: horaStr.slice(0, 5),
            fechaHoraInicio: slotInicio.toISOString(),
            fechaHoraFin: slotFin.toISOString(),
            disponible: !ocupado
          });
        }
      }

      return res.status(200).json({
        medico: {
          id: medico.id,
          nombre: medico.nombre,
          especialidad: medico.especialidad
        },
        fecha,
        slots
      });
    }

    // Modo PostgreSQL
    const medicoQuery = await pool.query('SELECT id, especialidad FROM medicos WHERE id = $1', [medicoId]);
    if (medicoQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Médico no encontrado' });
    }

    // Obtener citas ya reservadas para esa fecha
    const citasQuery = `
      SELECT fecha_hora_inicio 
      FROM citas 
      WHERE medico_id = $1 
        AND DATE(fecha_hora_inicio) = $2
        AND estado NOT IN ('CANCELADA');
    `;
    const citasReservadas = await pool.query(citasQuery, [medicoId, fecha]);
    const horasOcupadas = new Set(citasReservadas.rows.map(r => new Date(r.fecha_hora_inicio).toISOString()));

    const slots = [];
    for (let h = 8; h < 17; h++) {
      for (let m of [0, 30]) {
        const horaStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
        const slotInicio = new Date(`${fecha}T${horaStr}Z`);
        const slotFin = new Date(slotInicio.getTime() + 30 * 60000);

        const ocupado = horasOcupadas.has(slotInicio.toISOString());

        slots.push({
          hora: horaStr.slice(0, 5),
          fechaHoraInicio: slotInicio.toISOString(),
          fechaHoraFin: slotFin.toISOString(),
          disponible: !ocupado
        });
      }
    }

    return res.status(200).json({
      medicoId,
      fecha,
      slots
    });

  } catch (error) {
    console.error('Error en getDisponibilidad:', error);
    return res.status(500).json({ error: 'Error al consultar disponibilidad' });
  }
}

/**
 * Solicitar / Agendar una Cita Médica
 * POST /api/citas/solicitar
 */
async function solicitarCita(req, res) {
  try {
    const { medicoId, fechaHoraInicio, motivo } = req.body;
    const pacienteId = req.usuario.id;

    if (!medicoId || !fechaHoraInicio || !motivo) {
      return res.status(400).json({
        error: 'Campos requeridos faltantes',
        mensaje: 'medicoId, fechaHoraInicio y motivo son obligatorios.'
      });
    }

    const fechaInicio = new Date(fechaHoraInicio);
    if (isNaN(fechaInicio.getTime())) {
      return res.status(400).json({
        error: 'Fecha inválida',
        mensaje: 'fechaHoraInicio debe ser un formato de fecha ISO válido.'
      });
    }

    // Comprobar que no sea en el pasado
    if (fechaInicio < new Date()) {
      return res.status(400).json({
        error: 'Fecha extemporánea',
        mensaje: 'No se puede agendar una cita en una fecha u hora pasada.'
      });
    }

    const fechaFin = new Date(fechaInicio.getTime() + 30 * 60000); // 30 min por defecto

    // Modo Memoria / Fallback
    if (isMemoryMode) {
      // 1. Validar colisión (Race Condition / Conflicto)
      const colision = memoryStore.citas.find(c => 
        c.medico_id === medicoId &&
        new Date(c.fecha_hora_inicio).getTime() === fechaInicio.getTime() &&
        c.estado !== 'CANCELADA'
      );

      if (colision) {
        return res.status(409).json({
          error: 'Conflicto de horario (Slot no disponible)',
          mensaje: 'El horario seleccionado ya ha sido reservado para este médico. Por favor seleccione otro turno.'
        });
      }

      const nuevaCita = {
        id: `cita-${Date.now()}`,
        paciente_id: pacienteId,
        medico_id: medicoId,
        fecha_hora_inicio: fechaInicio.toISOString(),
        fecha_hora_fin: fechaFin.toISOString(),
        estado: 'PENDIENTE',
        motivo,
        created_at: new Date()
      };

      memoryStore.citas.push(nuevaCita);

      return res.status(201).json({
        mensaje: 'Cita médica agendada exitosamente',
        cita: nuevaCita
      });
    }

    // Modo PostgreSQL Real (con transacción y manejo atómico de colisión)
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verificación con SELECT FOR UPDATE para evitar race condition
      const checkOcupado = `
        SELECT id FROM citas 
        WHERE medico_id = $1 
          AND fecha_hora_inicio = $2 
          AND estado != 'CANCELADA'
        FOR UPDATE;
      `;
      const resCheck = await client.query(checkOcupado, [medicoId, fechaInicio]);

      if (resCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'Conflicto de horario (Slot no disponible)',
          mensaje: 'El horario seleccionado ya ha sido reservado para este médico. Por favor seleccione otro turno.'
        });
      }

      const insertCita = `
        INSERT INTO citas (paciente_id, medico_id, fecha_hora_inicio, fecha_hora_fin, motivo, estado)
        VALUES ($1, $2, $3, $4, $5, 'PENDIENTE')
        RETURNING *;
      `;
      const result = await client.query(insertCita, [
        pacienteId,
        medicoId,
        fechaInicio,
        fechaFin,
        motivo
      ]);

      await client.query('COMMIT');

      return res.status(201).json({
        mensaje: 'Cita médica agendada exitosamente',
        cita: result.rows[0]
      });

    } catch (insertError) {
      await client.query('ROLLBACK');
      // Código PostgreSQL 23505 = unique_violation
      if (insertError.code === '23505') {
        return res.status(409).json({
          error: 'Conflicto de horario (Slot no disponible)',
          mensaje: 'El horario seleccionado ya ha sido reservado para este médico.'
        });
      }
      throw insertError;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error en solicitarCita:', error);
    return res.status(500).json({ error: 'Error al agendar la cita' });
  }
}

/**
 * Obtener citas del usuario autenticado
 * GET /api/citas/mis-citas
 */
async function getMisCitas(req, res) {
  try {
    const usuarioId = req.usuario.id;
    const rol = req.usuario.rol;

    if (isMemoryMode) {
      let citas = [];
      if (rol === 'ADMIN') {
        citas = memoryStore.citas;
      } else if (rol === 'MEDICO') {
        const doc = memoryStore.medicos.find(m => m.usuario_id === usuarioId);
        citas = doc ? memoryStore.citas.filter(c => c.medico_id === doc.id) : [];
      } else {
        // PACIENTE
        citas = memoryStore.citas.filter(c => c.paciente_id === usuarioId);
      }

      return res.status(200).json({ citas });
    }

    let queryText = '';
    let params = [];

    if (rol === 'ADMIN') {
      queryText = `
        SELECT c.*, u.nombre AS paciente_nombre, u.apellido AS paciente_apellido,
               m.especialidad, um.nombre AS medico_nombre, um.apellido AS medico_apellido
        FROM citas c
        JOIN usuarios u ON c.paciente_id = u.id
        JOIN medicos m ON c.medico_id = m.id
        JOIN usuarios um ON m.usuario_id = um.id
        ORDER BY c.fecha_hora_inicio DESC;
      `;
    } else if (rol === 'MEDICO') {
      queryText = `
        SELECT c.*, u.nombre AS paciente_nombre, u.apellido AS paciente_apellido
        FROM citas c
        JOIN usuarios u ON c.paciente_id = u.id
        JOIN medicos m ON c.medico_id = m.id
        WHERE m.usuario_id = $1
        ORDER BY c.fecha_hora_inicio ASC;
      `;
      params = [usuarioId];
    } else {
      // PACIENTE
      queryText = `
        SELECT c.*, m.especialidad, um.nombre AS medico_nombre, um.apellido AS medico_apellido
        FROM citas c
        JOIN medicos m ON c.medico_id = m.id
        JOIN usuarios um ON m.usuario_id = um.id
        WHERE c.paciente_id = $1
        ORDER BY c.fecha_hora_inicio ASC;
      `;
      params = [usuarioId];
    }

    const result = await pool.query(queryText, params);
    return res.status(200).json({ citas: result.rows });

  } catch (error) {
    console.error('Error en getMisCitas:', error);
    return res.status(500).json({ error: 'Error al obtener citas del usuario' });
  }
}

/**
 * Listado de médicos disponibles para el selector del Frontend
 * GET /api/citas/medicos
 */
async function getMedicos(req, res) {
  try {
    if (isMemoryMode) {
      return res.status(200).json({
        medicos: memoryStore.medicos.map(m => ({
          id: m.id,
          nombre: m.nombre,
          especialidad: m.especialidad,
          numeroLicencia: m.numero_licencia
        }))
      });
    }

    const queryMedicos = `
      SELECT m.id, CONCAT(u.nombre, ' ', u.apellido) AS nombre, m.especialidad, m.numero_licencia
      FROM medicos m
      JOIN usuarios u ON m.usuario_id = u.id
      WHERE m.activo = TRUE;
    `;
    const result = await pool.query(queryMedicos);
    return res.status(200).json({ medicos: result.rows });
  } catch (error) {
    console.error('Error en getMedicos:', error);
    return res.status(500).json({ error: 'Error al listar médicos' });
  }
}

module.exports = {
  getDisponibilidad,
  solicitarCita,
  getMisCitas,
  getMedicos
};

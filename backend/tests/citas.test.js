const { setMemoryMode } = require('../src/config/db');
setMemoryMode(true); // Forzar modo autónomo para pruebas de integración

const app = require('../src/app');
const http = require('http');

let server;
let port;
let baseUrl;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 ========================================================');
  console.log('🧪 INICIANDO BATERÍA DE PRUEBAS DE INTEGRACIÓN: BACKEND B-01');
  console.log('🧪 ========================================================\n');

  server = app.listen(0);
  port = server.address().port;
  baseUrl = `http://localhost:${port}`;

  let passed = 0;
  let failed = 0;

  async function assert(desc, condition, details = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${desc} -> ${details}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const health = await request('GET', '/health');
    assert('Health Check responde 200 OK', health.status === 200);

    // 2. Registro de Paciente
    const emailTest = `paciente_${Date.now()}@test.com`;
    const regRes = await request('POST', '/api/auth/register', {
      email: emailTest,
      password: 'PasswordSegura2026*',
      nombre: 'Ana',
      apellido: 'López',
      telefono: '+525511223344'
    });
    assert('Registro de nuevo paciente responde 201 Created', regRes.status === 201);
    assert('Registro devuelve token JWT', !!regRes.body.token);
    const pacienteToken = regRes.body.token;

    // 3. Registro con correo duplicado -> 409
    const regDup = await request('POST', '/api/auth/register', {
      email: emailTest,
      password: 'PasswordSegura2026*',
      nombre: 'Ana',
      apellido: 'López'
    });
    assert('Registro duplicado rechaza con 409 Conflict', regDup.status === 409);

    // 4. Login con credenciales válidas
    const loginRes = await request('POST', '/api/auth/login', {
      email: emailTest,
      password: 'PasswordSegura2026*'
    });
    assert('Login con credenciales correctas responde 200', loginRes.status === 200);

    // 5. Login con contraseña errónea -> 401
    const loginFail = await request('POST', '/api/auth/login', {
      email: emailTest,
      password: 'ClaveEquivocada*'
    });
    assert('Login con contraseña errónea responde 401 Unauthorized', loginFail.status === 401);

    // 6. Listado de médicos
    const medicosRes = await request('GET', '/api/citas/medicos');
    assert('Consulta de médicos responde 200 y array no vacío', medicosRes.status === 200 && medicosRes.body.medicos.length > 0);
    const doctor = medicosRes.body.medicos[0];

    // 7. Disponibilidad para fecha futura
    const fechaFutura = '2026-11-20';
    const dispRes = await request('GET', `/api/citas/disponibilidad?medicoId=${doctor.id}&fecha=${fechaFutura}`);
    assert('Disponibilidad responde 200 con slots', dispRes.status === 200 && Array.isArray(dispRes.body.slots));
    const primerSlot = dispRes.body.slots[0];

    // 8. Agendar cita en horario disponible
    const cita1 = await request('POST', '/api/citas/solicitar', {
      medicoId: doctor.id,
      fechaHoraInicio: primerSlot.fechaHoraInicio,
      motivo: 'Dolor de cabeza recurrente'
    }, pacienteToken);
    assert('Agendar cita en slot disponible responde 201 Created', cita1.status === 201);

    // 9. REGLA CLAVE: Intentar agendar en el MISMO horario y médico -> 409 Conflict
    const citaColision = await request('POST', '/api/citas/solicitar', {
      medicoId: doctor.id,
      fechaHoraInicio: primerSlot.fechaHoraInicio,
      motivo: 'Chequeo rutinario'
    }, pacienteToken);
    assert('Intento de agendar cita en horario ocupado RECHAZA con 409 Conflict', citaColision.status === 409, JSON.stringify(citaColision.body));

    // 10. Agendar con fecha pasada -> 400 Bad Request
    const citaPasada = await request('POST', '/api/citas/solicitar', {
      medicoId: doctor.id,
      fechaHoraInicio: '2020-01-01T10:00:00.000Z',
      motivo: 'Fecha vieja'
    }, pacienteToken);
    assert('Agendar cita en fecha pasada rechaza con 400 Bad Request', citaPasada.status === 400);

    // 11. Consultar Mis Citas
    const misCitas = await request('GET', '/api/citas/mis-citas', null, pacienteToken);
    assert('Consultar mis-citas devuelve la cita registrada', misCitas.status === 200 && misCitas.body.citas.length >= 1);

    console.log(`\n========================================================`);
    console.log(`RESULTADO FINAL: ${passed} superadas | ${failed} fallidas`);
    console.log(`========================================================\n`);

    server.close();
    process.exit(failed > 0 ? 1 : 0);

  } catch (err) {
    console.error('Error durante la ejecución de pruebas:', err);
    if (server) server.close();
    process.exit(1);
  }
}

runTests();

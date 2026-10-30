# SaludDigital - Fase 1: Plan de Ejecución y Órdenes de Trabajo
**Orquestador:** Agente Orquestador  
**Fecha de Aprobación:** 15 de Octubre de 2026  
**Estado:** En Ejecución  

---

## 1. Alcance de la Fase 1
- **Núcleo de Autenticación y Autorización**: Registro de pacientes, inicio de sesión seguro (JWT + Bcrypt), roles del sistema (`PACIENTE`, `MEDICO`, `ADMIN`).
- **Gestión de Disponibilidad y Citas**: Modelado de médicos, horarios y reglas de negocio para impedir solapamientos o reservas en horarios no disponibles.
- **Frontend Clínico**: Vistas de autenticación y panel de paciente para solicitud y visualización de citas con soporte de diseño responsivo y tema claro/oscuro.
- **Control de Calidad (QA)**: Matriz de pruebas para validación de datos, control de roles y pruebas de estrés ante colisiones de citas.

---

## 2. Estructura de Directorios del Proyecto
```
pruebas_IA_1/
├── .agents/
│   └── agents/
│       ├── orquestador.md
│       ├── frontend.md
│       ├── backend.md
│       └── qa.md
├── docs/
│   └── fase1-plan-ejecucion.md
├── backend/            <-- Espacio exclusivo del Agente Backend
└── frontend/           <-- Espacio exclusivo del Agente Frontend
```

---

## 3. Hoja de Trabajo y Contratos de Servicio

### Tarea B-01: Backend - Modelado PostgreSQL y Autenticación
- **Responsable:** `backend`
- **Entregables:**
  1. Configuración del proyecto Node.js/Express en `backend/`.
  2. Scripts DDL/migraciones para tablas: `roles`, `usuarios`, `medicos`, `citas`.
  3. Restricción de unicidad para evitar traslapes: `(medico_id, fecha_hora_inicio)`.
  4. Endpoints:
     - `POST /api/auth/register`
     - `POST /api/auth/login`
     - `GET /api/auth/me`
     - `GET /api/citas/disponibilidad`
     - `POST /api/citas/solicitar`
     - `GET /api/citas/mis-citas`
- **Estado:** `EN CURSO (DESPACHADO)`

### Tarea F-01: Frontend - Vistas de Auth y Panel de Citas
- **Responsable:** `frontend`
- **Dependencia:** Tarea B-01 (Contratos de API definidos)
- **Entregables:**
  1. Configuración de proyecto React en `frontend/`.
  2. Tema visual accesible, paleta clínica, alternancia Modo Claro/Oscuro.
  3. Pantallas de Login y Registro con validación de inputs.
  4. Vista de reserva de citas con cuadrícula de disponibilidad y bloqueo de slots ocupados.
- **Estado:** `EN ESPERA DE BACKEND`

### Tarea Q-01: QA - Auditoría y Casos de Prueba de Colisión
- **Responsable:** `qa`
- **Dependencia:** Tarea B-01 y F-01
- **Entregables:**
  1. Reporte de pruebas funcionales y validaciones de borde.
  2. Validación de rechazo HTTP 409 ante citas duplicadas.
  3. Pruebas de seguridad para roles no autorizados.
- **Estado:** `EN ESPERA DE DESPLIEGUE`

# Contratos de API REST - SaludDigital (Fase 1)
**Autor:** Agente Backend  
**Destinatarios:** Agente Frontend (`frontend.md`), Agente QA (`qa.md`), Orquestador  
**Versión:** 1.0.0  

Este documento define con precisión las rutas, payloads, respuestas y códigos de estado HTTP implementados en el servicio backend para la Fase 1.

---

## 1. Módulo de Autenticación (`/api/auth`)

### 1.1 Registro de Paciente
* **Método / Ruta:** `POST /api/auth/register`
* **Acceso:** Público
* **Cuerpo de Solicitud (JSON):**
```json
{
  "email": "paciente@correo.com",
  "password": "Password123*",
  "nombre": "Ana",
  "apellido": "López",
  "telefono": "+525512345678"
}
```
* **Respuestas:**
  - `201 Created`:
    ```json
    {
      "mensaje": "Registro exitoso como Paciente",
      "usuario": {
        "id": "uuid-o-id",
        "email": "paciente@correo.com",
        "nombre": "Ana",
        "apellido": "López",
        "rol": "PACIENTE"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```
  - `400 Bad Request`: Formato de email inválido o contraseña menor a 8 caracteres.
  - `409 Conflict`: Ya existe un usuario registrado con ese email.

---

### 1.2 Inicio de Sesión
* **Método / Ruta:** `POST /api/auth/login`
* **Acceso:** Público
* **Cuerpo de Solicitud (JSON):**
```json
{
  "email": "paciente@correo.com",
  "password": "Password123*"
}
```
* **Respuestas:**
  - `200 OK`:
    ```json
    {
      "mensaje": "Autenticación exitosa",
      "usuario": {
        "id": "uuid",
        "email": "paciente@correo.com",
        "nombre": "Ana",
        "apellido": "López",
        "rol": "PACIENTE"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```
  - `401 Unauthorized`: Credenciales inválidas.

---

### 1.3 Perfil del Usuario en Sesión
* **Método / Ruta:** `GET /api/auth/me`
* **Acceso:** Requiere cabecera `Authorization: Bearer <TOKEN>`
* **Respuesta `200 OK`:**
```json
{
  "usuario": {
    "id": "uuid",
    "email": "paciente@correo.com",
    "rol": "PACIENTE",
    "nombre": "Ana",
    "apellido": "López"
  }
}
```

---

## 2. Módulo de Citas Médicas (`/api/citas`)

### 2.1 Listado de Médicos
* **Método / Ruta:** `GET /api/citas/medicos`
* **Acceso:** Público
* **Respuesta `200 OK`:**
```json
{
  "medicos": [
    {
      "id": "doc-reg-001",
      "nombre": "Dr. Carlos García",
      "especialidad": "Medicina General",
      "numeroLicencia": "MED-789012"
    }
  ]
}
```

---

### 2.2 Consulta de Disponibilidad de Horarios
* **Método / Ruta:** `GET /api/citas/disponibilidad?medicoId=doc-reg-001&fecha=2026-11-20`
* **Acceso:** Público
* **Respuesta `200 OK`:**
```json
{
  "medico": {
    "id": "doc-reg-001",
    "nombre": "Dr. Carlos García",
    "especialidad": "Medicina General"
  },
  "fecha": "2026-11-20",
  "slots": [
    {
      "hora": "08:00",
      "fechaHoraInicio": "2026-11-20T08:00:00.000Z",
      "fechaHoraFin": "2026-11-20T08:30:00.000Z",
      "disponible": true
    },
    {
      "hora": "08:30",
      "fechaHoraInicio": "2026-11-20T08:30:00.000Z",
      "fechaHoraFin": "2026-11-20T09:00:00.000Z",
      "disponible": false
    }
  ]
}
```

---

### 2.3 Solicitar / Agendar Cita
* **Método / Ruta:** `POST /api/citas/solicitar`
* **Acceso:** Protegido (`PACIENTE` o `ADMIN`). Cabecera `Authorization: Bearer <TOKEN>`
* **Cuerpo de Solicitud (JSON):**
```json
{
  "medicoId": "doc-reg-001",
  "fechaHoraInicio": "2026-11-20T08:00:00.000Z",
  "motivo": "Dolor de cabeza recurrente"
}
```
* **Respuestas:**
  - `201 Created`:
    ```json
    {
      "mensaje": "Cita médica agendada exitosamente",
      "cita": {
        "id": "cita-1729000000",
        "paciente_id": "pac-123",
        "medico_id": "doc-reg-001",
        "fecha_hora_inicio": "2026-11-20T08:00:00.000Z",
        "fecha_hora_fin": "2026-11-20T08:30:00.000Z",
        "estado": "PENDIENTE",
        "motivo": "Dolor de cabeza recurrente"
      }
    }
    ```
  - `400 Bad Request`: Falta algún campo o la fecha está en el pasado.
  - `409 Conflict`: **REGLA DE COLISIÓN**. El horario ya fue reservado para este médico.
    ```json
    {
      "error": "Conflicto de horario (Slot no disponible)",
      "mensaje": "El horario seleccionado ya ha sido reservado para este médico. Por favor seleccione otro turno."
    }
    ```

---

### 2.4 Consultar Citas del Usuario
* **Método / Ruta:** `GET /api/citas/mis-citas`
* **Acceso:** Protegido (`Authorization: Bearer <TOKEN>`)
* **Respuesta `200 OK`:**
```json
{
  "citas": [
    {
      "id": "cita-1729000000",
      "fecha_hora_inicio": "2026-11-20T08:00:00.000Z",
      "fecha_hora_fin": "2026-11-20T08:30:00.000Z",
      "estado": "PENDIENTE",
      "motivo": "Dolor de cabeza recurrente",
      "medico_nombre": "Carlos García",
      "especialidad": "Medicina General"
    }
  ]
}
```

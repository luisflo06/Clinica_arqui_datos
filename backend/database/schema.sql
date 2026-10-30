-- ============================================================================
-- SaludDigital - Esquema de Base de Datos PostgreSQL (Fase 1)
-- ============================================================================

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Roles de Usuario
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion VARCHAR(255)
);

-- Insertar roles base del sistema
INSERT INTO roles (nombre, descripcion) VALUES
('PACIENTE', 'Usuario general que agenda citas y consulta su expediente'),
('MEDICO', 'Profesional de la salud que atiende y emite órdenes médicas'),
('ADMIN', 'Administrador clínico del sistema con control total')
ON CONFLICT (nombre) DO NOTHING;

-- 2. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol_id INT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol_id);

-- 3. Tabla de Médicos (Extensión de perfil clínico)
CREATE TABLE IF NOT EXISTS medicos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    especialidad VARCHAR(100) NOT NULL,
    numero_licencia VARCHAR(50) UNIQUE NOT NULL,
    horario_inicio TIME DEFAULT '08:00:00',
    horario_fin TIME DEFAULT '17:00:00',
    duracion_slot_minutos INT DEFAULT 30,
    activo BOOLEAN DEFAULT TRUE
);

-- 4. Tabla de Citas Médicas
CREATE TABLE IF NOT EXISTS citas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paciente_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE RESTRICT,
    fecha_hora_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_hora_fin TIMESTAMP WITH TIME ZONE NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' 
        CHECK (estado IN ('PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'REPROGRAMADA', 'COMPLETADA')),
    motivo VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- REGLA DE ORO DE INTEGRIDAD:
    -- Evita a nivel relacional que un médico tenga dos citas activas en el mismo horario
    CONSTRAINT uq_medico_slot UNIQUE (medico_id, fecha_hora_inicio)
);

CREATE INDEX IF NOT EXISTS idx_citas_paciente ON citas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_citas_medico_fecha ON citas(medico_id, fecha_hora_inicio);

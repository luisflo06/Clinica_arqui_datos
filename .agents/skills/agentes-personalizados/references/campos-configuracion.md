# Referencia Técnica de Configuración de Agentes Personalizados

En este documento se detallan todas las opciones del encabezado YAML frontmatter para Agentes Personalizados en Google Antigravity.

---

## 1. Estructura del Archivo

Los agentes se guardan como archivos Markdown individuales en:
- **Proyecto**: `.agents/agents/<nombre>.md`
- **Global**: `~/.gemini/config/agents/<nombre>.md`

---

## 2. Definición Detallada de Campos

### `name` (Obligatorio)
- **Tipo**: `string`
- **Convención**: Minúsculas, separado por guiones (kebab-case).
- **Ejemplo**: `name: code-reviewer`

### `description` (Obligatorio)
- **Tipo**: `string`
- **Uso**: Describe la función del agente y bajo qué condiciones debe utilizarse.
- **Importancia**: El agente coordinador lee este campo para decidir de forma autónoma cuándo delegar tareas a este subagente.

### `model` (Opcional)
- **Tipo**: `string`
- **Valores comunes**: `flash`, `pro`, etc.
- **Uso**: Permite asignar modelos más rápidos y ligeros (como `flash`) para tareas mecánicas o modelos más potentes para razonamiento complejo.

### `mainAgent` y `subagent` (Simetría de Ejecución)
- **`mainAgent: true`**: Permite interactuar con el agente directamente como agente primario en la interfaz gráfica (selector de agentes) o mediante CLI (`agy --agent <nombre>`).
- **`subagent: true`**: Permite que el agente sea llamado de manera subordinada por un coordinador u otro agente.
- **Ambos en `true`**: Otorga simetría total de ejecución según la necesidad del flujo de trabajo.

### `tools` (Herramientas Permitidas)
- **Tipo**: `list<string>`
- **Uso**: Acota las herramientas disponibles para el agente, reduciendo el riesgo de alucinaciones y optimizando el consumo de tokens.
- **Herramientas típicas**:
  - `view_file`: Lectura e inspección de archivos.
  - `replace_file_content`: Edición de bloques de archivos.
  - `write_to_file`: Creación de archivos nuevos.
  - `run_command`: Ejecución de comandos en la terminal.
  - `manage_task`: Gestión de tareas en segundo plano.
  - `grep_search`: Búsqueda de patrones en el código.

### `skills` (Habilidades Asignadas)
- **Tipo**: `list<string>`
- **Uso**: Especifica las habilidades de dominio relevantes.
- **Sintaxis**: Rutas relativas como `skills/<nombre-habilidad>`.

### `permissionMode` (Modo de Permisos)
- **Tipo**: `string`
- **Valores**:
  - `default`: Pregunta confirmación según las políticas estándar.
  - `acceptEdits`: Aprueba automáticamente modificaciones de archivos pero supervisa acciones de riesgo.
  - `bypassPermissions`: Modo sin restricciones (usar con precaución).

### `commandExecutionPolicy` (Filtro de Ejecución de Comandos)
- **Tipo**: `string`
- **Valores**:
  - `auto`: Permite la ejecución autónoma de comandos estándar y seguros (compilaciones, linters, tests) mientras mantiene protegidos con confirmación manual los comandos de alto impacto (borrado de datos, migraciones destructivas).
  - `prompt`: Requiere confirmación para cada comando.

---

## 3. Ejemplo Completo

```markdown
---
name: security-auditor
description: Realiza auditorías de seguridad en el código fuente, detecta secretos expuestos y dependencias vulnerables.
model: flash
mainAgent: true
subagent: true
tools:
  - view_file
  - grep_search
  - run_command
skills:
  - skills/security-guidelines
permissionMode: acceptEdits
commandExecutionPolicy: auto
---

# Auditor de Seguridad

Eres un auditor de seguridad enfocado en prevenir fugas de credenciales y analizar dependencias vulnerables.

## Tareas Clave
1. Escanear el código buscando patrones de tokens, claves API y secretos.
2. Comprobar avisos de seguridad en paquetes instalados.
3. Generar un informe con hallazgos categorizados por severidad (Crítica, Alta, Media, Baja).
```

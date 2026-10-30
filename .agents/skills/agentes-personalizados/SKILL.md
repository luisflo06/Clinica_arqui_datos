---
name: agentes-personalizados
description: >-
  Guía completa para crear, configurar y utilizar agentes personalizados (Custom Agents) en Antigravity.
  Úsala cuando el usuario quiera crear nuevos agentes, configurar subagentes o agentes principales,
  definir permisos y políticas de ejecución, o modularizar flujos de trabajo con herramientas y habilidades específicas.
---

# Habilidad: Agentes Personalizados en Google Antigravity

Esta habilidad proporciona las directrices, especificaciones y mejores prácticas para definir, configurar e invocar **Agentes Personalizados** (Custom Agents) en Antigravity 2.0, Antigravity CLI y Antigravity IDE.

---

## 1. ¿Qué es un Agente Personalizado?

Un **Agente Personalizado** es una configuración declarativa basada en un único archivo Markdown (`.md`) con encabezado YAML frontmatter que define un rol de trabajo especializado:
- **Instrucciones de rol**: Directivas del sistema precisas en el cuerpo Markdown.
- **Herramientas acotadas (`tools`)**: Evita la saturación del contexto habilitando solo las herramientas requeridas.
- **Habilidades curadas (`skills`)**: Vincula habilidades específicas relevantes para la tarea.
- **Modelo de lenguaje (`model`)**: Selección del modelo adecuado (ej. `flash`, `pro`).
- **Simetría de ejecución (`mainAgent` / `subagent`)**: Puede operar como agente primario con el que el usuario interactúa directamente o como subagente subordinado a un coordinador.
- **Políticas de seguridad (`commandExecutionPolicy`)**: Autonomía controlada para comandos comunes sin solicitudes constantes de confirmación.

---

## 2. Ubicaciones de Almacenamiento

Los archivos de agentes se guardan con extensión `.md`:

1. **A nivel de Proyecto (Recomendado para equipos)**:
   - Ruta: `.agents/agents/<nombre-del-agente>.md`
   - *Ventaja*: Se sincroniza mediante control de versiones (Git) y está disponible automáticamente para todo el equipo.
2. **A nivel Global (Usuario local)**:
   - Ruta: `~/.gemini/config/agents/<nombre-del-agente>.md`
   - *Ventaja*: Disponible en todos los proyectos de tu máquina personal.

---

## 3. Formato del Archivo del Agente

Cada agente es un archivo `.md` compuesto por dos secciones:
1. **Frontmatter YAML**: Metadatos de ejecución y permisos.
2. **Cuerpo Markdown**: Instrucciones del sistema (System Prompt) compiladas directamente en el comportamiento del agente.

### Plantilla Base

```markdown
---
name: nombre-del-agente
description: Breve descripción en tercera persona de las capacidades del agente y cuándo usarlo.
model: flash
mainAgent: true
subagent: true
tools:
  - view_file
  - replace_file_content
  - run_command
  - manage_task
skills:
  - skills/mi-habilidad-especifica
permissionMode: acceptEdits
commandExecutionPolicy: auto
---

# Instrucciones Principales
Eres un especialista en [Área/Rol]. Tu objetivo es...

## Directrices de Trabajo
1. Analiza los archivos relevantes antes de modificar.
2. Ejecuta pruebas para validar cambios.
```

---

## 4. Campos del Frontmatter YAML

| Campo | Tipo | Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| `name` | String | Sí | Identificador único en minúsculas y separado por guiones (ej. `dependency-modernizer`). |
| `description` | String | Sí | Describe el rol del agente. Esencial para que el coordinador decida cuándo delegar a este subagente. |
| `model` | String | No | Modelo asignado (ej. `flash`, `pro`). Por defecto usa el modelo del sistema. |
| `mainAgent` | Boolean | No | Si es `true`, puede iniciarse directamente como sesión principal desde la GUI o el CLI. |
| `subagent` | Boolean | No | Si es `true`, puede invocarse como subagente por un coordinador u otro agente. |
| `tools` | Array[String]| No | Lista estricta de herramientas permitidas. Previene confusión y ahorra tokens. |
| `skills` | Array[String]| No | Rutas relativas a habilidades (`skills/...`) que este agente puede consultar. |
| `permissionMode` | String | No | Modo de permisos (`acceptEdits`, `bypassPermissions`, etc.). |
| `commandExecutionPolicy` | String | No | Política de comandos (ej. `auto` para ejecutar pruebas/compilaciones de forma autónoma manteniendo comandos de riesgo bajo confirmación). |

---

## 5. Modos de Invocación

Antigravity proporciona **simetría de ejecución**:

### A. Como Agente Principal (Main Agent)
- **Desde la GUI (Antigravity 2.0 / IDE)**:
  Selecciona el agente directamente desde el menú desplegable de selección de agentes.
- **Desde la Línea de Comandos (CLI)**:
  ```bash
  agy --agent <nombre-del-agente>
  ```
  *Ejemplo*:
  ```bash
  agy --agent dependency-modernizer
  ```

### B. Como Subagente (Subagent)
- Delegado dinámicamente por un agente coordinador cuando una tarea coincide con la `description` y capacidades del agente personalizado.
- El agente coordinador invoca al subagente pasando el contexto y el prompt de la tarea específica.

---

## 6. Procedimiento para Crear un Agente en un Proyecto

Cuando el usuario solicite crear un agente en el proyecto actual:

1. **Crear el directorio si no existe**:
   Asegurar que `.agents/agents/` exista en la raíz del proyecto.
2. **Definir el archivo Markdown**:
   Crear `.agents/agents/<nombre-agente>.md`.
3. **Configurar el frontmatter**:
   - Asignar `name` y una `description` clara.
   - Definir `mainAgent: true` y/o `subagent: true`.
   - Limitar `tools` a solo las requeridas.
   - Si requiere habilidades complementarias, listarlas en `skills`.
   - Configurar `commandExecutionPolicy: auto` si realizará ejecuciones repetitivas de prueba/build.
4. **Escribir el cuerpo del prompt**:
   Establecer claramente el rol, entradas esperadas, pasos a seguir y validaciones de salida.
5. **Verificar el archivo**:
   Validar que la sintaxis YAML sea correcta y que las herramientas referenciadas sean válidas.

---

## 7. Recursos y Ejemplos

- [Ejemplo de Agente Modernizador de Dependencias](./examples/dependency-modernizer.md)
- [Referencia completa de campos y políticas](./references/campos-configuracion.md)

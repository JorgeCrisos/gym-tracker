# GymLog

Aplicación PWA de entrenamiento para dos personas, con registro individual y sesiones conjuntas, estadísticas, rutinas y sincronización segura.

## Estado del repositorio
- main: versión original RepTrack Pro V8, conservada sin cambios.
- backup/gym-log-v8: rama de respaldo del punto de partida.
- develop: rama de trabajo para la nueva aplicación.
- index.html, index_v1_backup.html y supabase_schema.sql: legado de RepTrack V8. No borrar ni ejecutar el SQL como base de la nueva aplicación.

## Documentación
- [Arquitectura objetivo](docs/ARQUITECTURA.md)
- [Auditoría inicial de seguridad](docs/AUDITORIA_SEGURIDAD.md)

## Principios
1. Los datos personales de cada cuenta son privados por defecto.
2. Una sesión conjunta puede registrarse desde un solo móvil, pero cada participante conserva sus propias series y métricas.
3. Ser miembro del grupo no da acceso automático al historial privado del otro.
4. RLS protege los datos en el servidor; ocultar elementos en la interfaz no es seguridad.
5. No se incluyen secretos en el frontend. Nunca usar service_role en el navegador.
6. No ejecutar migraciones en Supabase hasta revisar el esquema y probar las políticas con dos cuentas.

## Desarrollo
La nueva versión se construirá en develop con React, TypeScript y Vite, y se desplegará inicialmente como preview. La configuración de Supabase se realizará mediante variables de entorno locales no versionadas.

Los comandos de instalación y ejecución se añadirán cuando se incorpore el esqueleto de la nueva aplicación.

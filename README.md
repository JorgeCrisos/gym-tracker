# GymLog

Nueva aplicación PWA de entrenamiento para dos personas, con registro individual y sesiones conjuntas, estadísticas, rutinas y sincronización segura.

## Estado del repositorio
- main: versión original RepTrack Pro V8, conservada sin cambios.
- backup/gym-log-v8: rama de respaldo del punto de partida.
- develop: rama de trabajo para la nueva aplicación.
- La versión original permanece en la raíz como legado. La nueva aplicación vive en app/.

## Documentación
- [Arquitectura objetivo](docs/ARQUITECTURA.md)
- [Auditoría inicial de seguridad](docs/AUDITORIA_SEGURIDAD.md)

## Desarrollo local
1. Instala Node.js LTS.
2. Ejecuta npm install.
3. Copia .env.example como .env.local si vas a conectar un proyecto Supabase de desarrollo.
4. Ejecuta npm run dev.
5. Para comprobar la compilación, ejecuta npm run build.

La configuración de Supabase todavía no está conectada. No pegues claves privadas ni service_role en el frontend.

## Despliegue Netlify
- Build command: npm run build
- Publish directory: dist
- Base directory: raíz del repositorio

La nueva versión debe desplegarse primero como preview, sin sustituir la app actual hasta validar autenticación, privacidad, RLS y sincronización.

## Principios
1. Los datos personales de cada cuenta son privados por defecto.
2. Una sesión conjunta puede registrarse desde un solo móvil, pero cada participante conserva sus propias series y métricas.
3. Ser miembro del grupo no da acceso automático al historial privado del otro.
4. RLS protege los datos en el servidor; ocultar elementos en la interfaz no es seguridad.
5. No se incluyen secretos en el frontend. Nunca usar service_role en el navegador.
6. No ejecutar migraciones en Supabase hasta revisar el esquema y probar las políticas con dos cuentas.

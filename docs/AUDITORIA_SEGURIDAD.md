# Auditoría inicial de seguridad — RepTrack Pro V8

Fecha: 2026-11-18  
Alcance: lectura estática de index.html y supabase_schema.sql de main. No se ha accedido al proyecto Supabase ni se han ejecutado consultas o migraciones.

## Hallazgos

### Privacidad: lectura de datos de todo el grupo
En index.html, la función gl7PullState() consulta member_data filtrando solo por group_id y carga workouts y body_data de todas las filas del grupo. Después combina los entrenamientos y perfiles físicos en el estado local del dispositivo.

En supabase_schema.sql, la política member_data_select_same_group permite SELECT cuando is_group_member(group_id) es verdadero. Por tanto, cualquier miembro del grupo puede leer las filas de los demás. Esto incumple la privacidad individual acordada.

### Escritura conjunta incompatible con el modelo actual
Las políticas de INSERT y UPDATE limitan las filas al usuario autenticado. Sin embargo, el cliente intenta sincronizar datos usando el user_id de la persona seleccionada. Con esas políticas, una cuenta no puede escribir directamente la fila de la otra. El flujo conjunto desde un único móvil no está resuelto de forma coherente.

### Datos locales y arranque
La aplicación conserva datos en localStorage y el bloque de arranque V8 elimina determinadas claves gl2_* salvo la configuración de nube. No se debe desplegar una versión modificada sobre datos reales sin estudiar ese efecto y disponer de exportación/copia de seguridad.

### Protección de sesión
La clave gl8_app_unlocked_v1 en sessionStorage es un bloqueo de interfaz adicional, no autorización. La seguridad real debe depender de Supabase Auth y RLS.

### Credenciales
En el index.html inspeccionado no aparece una cadena service_role ni una clave de servicio hardcodeada. La app solicita URL y clave pública de Supabase en su configuración. Una clave pública/anon o publishable solo es aceptable en cliente si RLS está correctamente configurado. Nunca publicar service_role, contraseñas ni tokens privados.

## Acciones obligatorias antes de producción
1. Sustituir el acceso grupal amplio por políticas RLS de propietario y participante.
2. Separar metadatos de sesión compartida de series y datos personales.
3. Implementar y probar el flujo de escritura conjunta con permisos mínimos y sin lectura cruzada.
4. Proteger fotos con Storage privado y políticas por propietario.
5. Probar SELECT/INSERT/UPDATE/DELETE con dos usuarios distintos y con un usuario ajeno al grupo.
6. Revisar el esquema real de Supabase antes de cualquier migración.
7. Añadir exportación/copia de seguridad y procedimiento de recuperación antes de importar datos reales.

## Estado
- Auditoría estática inicial: realizada.
- Cambios en Supabase: ninguno.
- SQL ejecutado: ninguno.
- Datos reales modificados: ninguno.
- Código de la aplicación: todavía sin modificar.

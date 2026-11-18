# Arquitectura objetivo — GymLog

## Objetivo
Aplicación de entrenamiento para Jorge y Marta, instalable como PWA en iPhone y adaptable a iPad y escritorio. Debe funcionar con conexión intermitente, sincronizar de forma fiable y proteger los datos privados de cada cuenta.

## Decisiones propuestas
- Frontend: React + TypeScript + Vite, sustituyendo progresivamente el HTML monolítico.
- PWA: manifest, service worker y estrategia offline-first prudente. Los registros pendientes se guardan localmente y se sincronizan al recuperar conexión.
- Backend: Supabase Auth, PostgreSQL, Row Level Security (RLS), Storage privado y Realtime cuando aporte valor.
- Despliegue: Netlify conectado a GitHub; previews desde ramas/PR.
- Calidad: TypeScript estricto, ESLint y pruebas de lógica y de políticas RLS.

## Modelo funcional
1. Cada persona tiene su propia cuenta y perfil.
2. Las sesiones individuales son privadas.
3. Las sesiones conjuntas tienen participantes explícitos. Se pueden registrar desde un solo teléfono, pero cada participante tiene sus propias series, cargas, repeticiones, RPE y notas.
4. Las rutinas pueden ser privadas o compartidas explícitamente.
5. Peso, medidas, fotos, sueño, sensaciones y fatiga son privados por defecto.
6. Las comparativas solo muestran datos agregados o métricas autorizadas por ambas personas.

## Modelo de datos objetivo (borrador)
- profiles: perfil asociado a auth.users.
- groups y group_members: vínculo entre cuentas; no concede acceso general a datos privados.
- exercises: catálogo común.
- routines y routine_exercises: rutinas con propietario y visibilidad.
- workout_sessions: fecha, creador, tipo, estado y metadatos.
- workout_participants: participantes de una sesión conjunta.
- workout_sets: series vinculadas a participante y ejercicio; peso, repeticiones, RPE, descanso y notas.
- body_metrics, recovery_logs y goals: datos personales con propietario explícito.
- progress_photos: metadatos; ficheros en un bucket privado de Supabase Storage.
- audit_events, si se necesita trazabilidad adicional.

El esquema definitivo se diseñará y revisará antes de ejecutar cualquier migración en Supabase.

## Reglas de autorización
- RLS activado en todas las tablas con datos de usuario.
- Ser miembro del grupo no permite leer métricas, recuperación, fotos, objetivos ni series privadas de otra persona.
- Las series se consultan por propietario/participante autorizado, nunca descargando todos los datos del grupo.
- Una sesión conjunta comparte solo metadatos necesarios y pertenencia. Cada persona conserva el control de sus datos personales.
- Para registrar a ambos desde un solo móvil se diseñará una operación de escritura limitada a una sesión conjunta activa y a participantes del mismo grupo. Ese permiso de escritura no concede lectura del historial del otro.
- Las fotos usarán Storage privado.
- Nunca incluir service_role ni secretos de servidor en el frontend.

## Flujo de entrenamiento conjunto
1. Una persona inicia una sesión conjunta y selecciona al otro participante.
2. Se crea una sesión con dos participantes.
3. En cada ejercicio se muestran entradas separadas para cada persona.
4. El móvil puede introducir series de ambos, identificando siempre al propietario de cada serie.
5. Cada cuenta sincroniza y consulta solo los datos autorizados.

## Módulos de interfaz
- Inicio y selector: Jorge, Marta o entrenar juntos.
- Entrenar: sesión activa, ejercicios, series, descansos y guardado automático.
- Rutinas y planificación semanal.
- Historial y calendario.
- Estadísticas: volumen, frecuencia, evolución, grupos musculares y récords.
- Objetivos.
- Perfil: medidas, peso, recuperación y ajustes.
- Exportación CSV/Excel.

## Migración desde RepTrack V8
1. Conservar index.html, index_v1_backup.html y supabase_schema.sql como legado; no borrarlos ni ejecutarlos.
2. Crear la nueva aplicación en módulos independientes.
3. Diseñar el nuevo esquema y probar RLS en un entorno Supabase de desarrollo.
4. Validar cuentas, privacidad, sesiones conjuntas y sincronización con datos de prueba.
5. Preparar importación opcional de datos antiguos, con copia de seguridad y mapeo explícito de propietarios.
6. Desplegar una preview y solo después decidir el cambio de producción.

## Criterios de aceptación
- Jorge no puede consultar datos privados de Marta y viceversa, ni manipulando peticiones desde el navegador.
- Una sesión conjunta se registra desde un móvil con series separadas.
- Ambos dispositivos ven la información autorizada y sincronizan sin duplicados.
- Los datos sobreviven a cierre, recarga y pérdida temporal de conexión.
- La aplicación es instalable y usable en iPhone, iPad y escritorio.
- No se publica ningún secreto ni se ejecutan migraciones no revisadas.

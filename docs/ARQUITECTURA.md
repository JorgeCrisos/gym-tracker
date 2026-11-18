# Arquitectura y estado de GymLog

## Stack y despliegue
- React 19 + TypeScript + Vite.
- PWA mediante `vite-plugin-pwa`.
- Hosting estático: GitHub Pages, con workflow `.github/workflows/deploy-pages.yml`.
- Backend: Supabase Auth y PostgreSQL.
- Autorización: Row Level Security (RLS) y RPC con permisos mínimos.
- Rama de despliegue: `develop`; `main` conserva la aplicación anterior.

## Modelo de datos Supabase actualmente utilizado
El proyecto Supabase `Gimnasio` ya contenía estas tablas:
- `groups`: espacio de dos personas, código de invitación y creador.
- `group_members`: relación entre cuenta autenticada y perfil Jorge/Marta.
- `member_data`: fila privada por miembro; guarda entrenamientos en `workouts` y datos personales en `body_data`.
- `shared_data`: rutinas compartidas del grupo.

No se ha creado un esquema paralelo innecesario. Se ha reforzado el esquema existente.

## Autorización
- `member_data SELECT`: solo `user_id = auth.uid()`. Ser miembro del mismo grupo ya no permite leer la fila de la otra persona.
- `member_data INSERT/UPDATE/DELETE`: propia fila y pertenencia al grupo, con RLS.
- `group_members` y `groups`: visibles para miembros del mismo grupo, para poder resolver el perfil y el código de invitación.
- `shared_data`: visible y modificable por los miembros del grupo; contiene solo rutinas compartidas.
- Las RPC de creación/unión/guardado conjunto se conceden a `authenticated`, no a `anon` ni a `PUBLIC`.
- `rls_auto_enable` no está expuesta como endpoint RPC.
- `save_gym_workout` verifica que ambas cuentas pertenecen al mismo grupo y divide las series entre sus filas privadas.
- La operación de expulsión de un miembro no elimina sus datos privados.

## Flujos de usuario
1. Cada persona registra su propia cuenta Supabase Auth.
2. Una persona crea el grupo eligiendo Jorge o Marta.
3. Comparte el código de invitación.
4. La segunda persona se une eligiendo el perfil restante. El RPC limita el grupo a dos miembros y evita nombres duplicados.
5. La aplicación carga únicamente `member_data` del usuario autenticado y las rutinas explícitamente compartidas.
6. En sesión conjunta, cada serie se atribuye a la persona seleccionada. Al finalizar, el RPC escribe la parte de cada persona en su fila privada.

## Estado funcional
- Interfaz: inicio, entrenar, rutinas, historial, estadísticas, objetivos y perfil.
- Entrenamiento: peso, repeticiones, RPE, descanso, temporizador y sesión individual/conjunta.
- Datos personales: objetivos, medidas y recuperación.
- Exportación CSV.
- Autenticación: registro e inicio de sesión por correo/contraseña.
- Vinculación de cuentas: crear grupo, compartir código y unirse.
- Sincronización: entrenamientos completados y datos de perfil a Supabase.
- No implementado aún: cola offline robusta, fotos privadas en Storage, Realtime, recuperación de conflictos multi-dispositivo y pruebas E2E automatizadas.

## Seguridad pendiente de validar
La base ya tiene RLS reforzada, pero todavía hay que completar pruebas funcionales con dos cuentas reales:
- Jorge no puede leer `member_data` de Marta.
- Marta no puede leer `member_data` de Jorge.
- Ambos pueden consultar las rutinas compartidas.
- En modo conjunto, el móvil del creador puede registrar series para ambas cuentas.
- Un usuario externo no puede consultar grupos ni datos privados.
- Reintentos de guardado no duplican entrenamientos.

El asesor de Supabase sigue señalando funciones SECURITY DEFINER accesibles a `authenticated`. Es intencional para las RPC necesarias y las políticas RLS; ya no están disponibles para usuarios anónimos. También advierte que la protección de contraseñas filtradas de Auth está desactivada en la configuración del proyecto.

## PWA en GitHub Pages
Vite utiliza la base `/gym-tracker/`, incluida en manifest y service worker. El workflow publica el directorio `dist/`. Para que funcione, Pages debe estar habilitado con fuente **GitHub Actions**; al ser privado el repositorio, el plan de GitHub puede condicionar esta función.

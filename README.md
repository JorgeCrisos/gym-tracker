# GymLog

PWA de entrenamiento para Jorge y Marta: sesiones individuales y conjuntas, rutinas, historial, estadísticas, objetivos y seguimiento físico. Frontend React + TypeScript + Vite; autenticación y datos en Supabase.

## Repositorio y ramas
- `main`: versión original RepTrack Pro V8, conservada.
- `backup/gym-log-v8`: respaldo del punto de partida.
- `develop`: nueva GymLog; rama de desarrollo y publicación beta.
- `app/`: frontend de la nueva PWA.

## Arquitectura
- **Frontend:** React, TypeScript, Vite y vite-plugin-pwa.
- **Hosting:** GitHub Pages, publicado por GitHub Actions desde `develop`.
- **Backend:** Supabase Auth + PostgreSQL + RLS.
- **Clave cliente:** Supabase publishable key. No hay service_role en el navegador.
- **Datos personales:** `member_data`, con lectura y escritura limitadas al propio `user_id`.
- **Datos compartidos:** `groups`, `group_members` y `shared_data` para vinculación de las dos cuentas y rutinas compartidas.
- **Entrenamiento conjunto:** RPC `save_gym_workout`, que divide las series por persona y las guarda en cada fila privada. Ser del mismo grupo no concede lectura del historial ajeno.

## Arranque local
1. Instala Node.js 22 o superior.
2. En la raíz, ejecuta `npm install`.
3. Ejecuta `npm run dev`.
4. Comprueba con `npm run lint` y `npm run build`.

La conexión de producción de Supabase está configurada en `app/src/lib/supabase.ts` con una clave publishable apta para cliente. Para desarrollar contra otro proyecto, usa variables de entorno y nunca una clave service_role.

## Despliegue
El workflow `.github/workflows/deploy-pages.yml` compila `app/` y publica `dist/` en GitHub Pages al hacer push en `develop`. El build de validación está en `.github/workflows/build.yml`.

En el repositorio, GitHub Pages debe tener la fuente de publicación configurada como **GitHub Actions** en Settings → Pages. El repositorio es privado: la disponibilidad de Pages depende del plan de GitHub asociado.

## Configuración de las dos cuentas
1. Cada persona crea su propia cuenta con su correo en GymLog.
2. La primera cuenta crea el grupo y elige Jorge o Marta.
3. La primera persona comparte el código de invitación.
4. La segunda cuenta se une con ese código y elige el otro perfil.
5. En el modo conjunto, desde un móvil se pueden registrar series de ambos. Cada persona recibe su copia de las series en su fila privada.

## Privacidad y limitaciones actuales
- La política de lectura de `member_data` se ha cambiado de acceso por grupo a acceso solo a la propia fila.
- Las funciones de creación/unión/guardado conjunto requieren usuario autenticado; se ha revocado el acceso anónimo.
- Eliminar a alguien del grupo no borra sus datos privados.
- Las fotos de progreso y sincronización offline avanzada todavía no están implementadas.
- La beta debe probarse con dos cuentas antes de introducir registros importantes. No se debe asumir que la privacidad está validada hasta completar pruebas cruzadas de Jorge y Marta.

## Documentación
- [Arquitectura y estado real](docs/ARQUITECTURA.md)
- [Auditoría de seguridad y cambios aplicados](docs/AUDITORIA_SEGURIDAD.md)
- [Migraciones SQL versionadas](supabase/migrations/)

# Auditoría de seguridad — GymLog

Fecha: 2026-11-18. Alcance: inspección del esquema real del proyecto Supabase `Gimnasio`, políticas RLS, funciones y frontend de la beta.

## Hallazgos iniciales del esquema existente
- `member_data_select_same_group` permitía a cualquier miembro leer las filas de todos los miembros del grupo. La fila contiene tanto entrenamientos como datos físicos.
- Varias funciones SECURITY DEFINER estaban ejecutables por `PUBLIC` y `anon`.
- `remove_gym_member` borraba la fila privada del miembro expulsado.
- Las tablas `member_data`, `groups`, `group_members` y `shared_data` ya tenían RLS habilitado.

## Cambios aplicados en Supabase
1. Se sustituyó la política de lectura grupal de `member_data` por una política de propietario: `user_id = auth.uid()`.
2. Se añadió DELETE limitado a la propia fila.
3. Se revocó EXECUTE de `PUBLIC` y `anon` para las RPC de grupos y guardado conjunto; se concedió a `authenticated` donde procede.
4. Se revocó la ejecución directa de `rls_auto_enable`.
5. Se fijó `search_path` en las funciones SECURITY DEFINER.
6. Se creó `save_gym_workout`, que verifica que el segundo miembro pertenece al mismo grupo y guarda por separado el entrenamiento de cada persona.
7. Los grupos se limitan a Jorge y Marta, dos miembros y nombres no duplicados.
8. La expulsión de un miembro ya no elimina su información privada.

## Estado de los avisos
- El asesor ya no detecta ejecución anónima de las RPC SECURITY DEFINER.
- Mantiene avisos para usuarios autenticados en las RPC que necesitan ejecutarse con privilegios elevados. Es intencional, pero debe probarse con cuentas reales.
- Sigue activo el aviso de protección de contraseñas filtradas desactivada en Supabase Auth. Puede activarse desde la configuración de Auth del proyecto.

## Pruebas que faltan antes de usar datos reales
- Crear dos cuentas separadas y unirlas al mismo grupo.
- Probar lecturas cruzadas de `member_data` desde ambas cuentas; deben devolver cero filas ajenas.
- Probar la escritura de un entrenamiento conjunto y verificar que cada cuenta recibe solo sus series.
- Probar un tercer usuario fuera del grupo.
- Probar reintentos y concurrencia para evitar duplicados.
- Verificar el despliegue de GitHub Pages y la instalación PWA en iPhone.

## Limitaciones
La auditoría de RLS no sustituye una prueba de penetración. No se ha ejecutado todavía un test E2E autenticado con dos usuarios reales. No se debe considerar la beta producción hasta completar esas pruebas.

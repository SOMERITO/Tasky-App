# Plan de pruebas — reglas multi-espacio

Fecha de actualización: 23 de noviembre de 2026.

> Ejecutar con Firebase Emulator Suite antes de publicar las reglas. No usar datos reales.

## Identidades de prueba
- José: rol owner en jose; guardian en leah.
- Camila: rol owner en camila; guardian en leah.
- Leah: rol child en leah.
- Visitante: sin membresías.

## Debe permitirse
- José lee y escribe `workspaces/jose/shared/main`.
- Camila lee y escribe `workspaces/camila/shared/main`.
- José y Camila leen y escriben `workspaces/leah/shared/main`.
- Leah lee `workspaces/leah/shared/main` únicamente cuando existe `access_control/private_modules` con `ready: true` y `schemaVersion: 1`.
- Leah crea una tarea propia válida directamente en `workspaces/leah/child_tasks`, sin aprobación previa.
- Leah edita los campos permitidos de una tarea propia mientras su estado sea `pending`.
- Leah cambia una tarea propia de `pending` a `awaiting_review`; los adultos pueden leer la nueva tarea y el cambio en tiempo real.
- José o Camila aprueban una tarea `awaiting_review` y la cambian a `completed`, o la devuelven a `pending`.
- Leah crea una solicitud `completion` únicamente para avisar que terminó una tarea creada por los adultos.
- Un adulto revisa una solicitud pendiente y actualiza únicamente los campos de revisión.
- Leah no puede editar una tarea creada por José o Camila ni una tarea propia que esté en `awaiting_review` o `completed`.
- Leah no puede establecer el estado `completed`, cambiar los metadatos de revisión ni eliminar tareas propias.
- Todos los miembros leen notificaciones del espacio Leah.
- José o Camila (guardian) pueden crear notificaciones compartidas válidas.

## Debe rechazarse
- Visitante lee o escribe cualquier workspace.
- José lee o escribe `workspaces/camila/**`.
- Camila lee o escribe `workspaces/jose/**`.
- Leah lee o escribe `workspaces/leah/adult_private/**`.
- Leah o un visitante lee o modifica `workspaces/leah/access_control/private_modules`.
- Una membresía child habilitada lee `shared/main` o `task_requests` antes de completar la migración privada.
- Leah crea, actualiza o elimina `workspaces/leah/shared/main`.
- Leah edita una tarea de otro usuario, borra una tarea o salta el estado `awaiting_review` para establecer `completed`.
- Leah actualiza o elimina cualquier solicitud después de crearla.
- Leah crea una solicitud con `createdBy` de otro UID, estado distinto de `pending`, campos no permitidos o tipo desconocido.
- Leah solicita un módulo privado (Salud o Gastos), un campo de descripción mayor a 500 caracteres o una prioridad fuera de la lista permitida.
- Un adulto modifica el contenido original de una solicitud; los cambios se limitan al estado y metadatos de revisión.
- Leah o un visitante intenta aprobar una solicitud o alterar su estado.
- Usuario miembro de un workspace consulta uno donde no tiene membresía.
- Leah crea una notificación compartida (solo los adultos pueden generarlas).

## Verificación en la aplicación
- Cerrar sesión elimina el tablero visible y el estado del workspace activo.
- Cambiar de espacio descarga el estado del siguiente workspace antes de renderizar.
- El token de Firebase Authentication acompaña todas las solicitudes a Firestore.
- No existe publicación, lectura o SSE en ntfy.sh.
- La aprobación de una solicitud actualiza el tablero y el estado de la solicitud en una sola transacción.
- La aplicación crea `adult_private/health`, `adult_private/expenses` y sanitiza `shared/main` en una misma transacción; el marcador se escribe solo al completar esa operación.
- Un documento `shared/main` existente pero ilegible bloquea la migración y no crea el marcador.
- El acceso infantil permanece deshabilitado hasta validar el aislamiento completo de Salud y Gastos en staging.

## Pruebas de navegador del acceso
- La pantalla inicial muestra primero el formulario de correo y contraseña.
- Después de autenticar, el selector contiene únicamente las membresías activas del UID.
- José ve solo José y Leah; Camila ve solo Cams y Leah; Leah ve solo Leah.
- Una cuenta sin membresías no puede seleccionar ningún espacio.
- La cuenta infantil de Leah no entra mientras `childAccessEnabled` siga deshabilitado.
- Una cuenta sin membresía para el perfil elegido recibe acceso denegado.
- El fixture de navegador bloquea las llamadas a endpoints reales de Firebase y no carga el motor de sincronización de producción.

## Resultado CI más reciente
- HEAD `72978d84bf96d66fda4c9692e4eddafc4162e510`: Firestore/Auth + Chromium #401 aprobó **44/44**; Tasky Security Checks #212 aprobó. La prueba REST de precondiciones Firestore en ese workflow aprobó **1/1**.
- `tests/sync-safety.test.mjs` invoca el algoritmo de conciliación actual con escenarios de dos dispositivos, cambios offline, caché sin versión, tombstones versionados y recreación más reciente.
- `tests/firestore-precondition.integration.test.mjs` usa Firestore Emulator REST y una configuración aislada (`firebase/emulator/sync-safety.firebase.json` + `firebase/emulator/firestore.sync-safety.rules`) para demostrar que dos escrituras con el mismo `updateTime` no pueden sobrescribirse, que el conflicto requiere releer y que los datos confirmados persisten tras una lectura posterior.
- Las reglas permisivas de la prueba REST solo cubren `/sync_safety_test/{documentId}` en ese emulator aislado. No se incluyen en `firebase.json` de despliegue ni en `firebase/firestore.rules`.
- Las pruebas locales y de emulador usan identidades, documentos y datos sintéticos; no modifican Firebase de producción.
- En Staging se publicó el canal temporal `codex-tasky-72978d8` para ese SHA. La verificación directa confirmó HTTP 200, formulario de acceso, panel familiar antes del tablero y selección runtime del proyecto `tasky-staging-82acb`. Las reglas activas de Staging coinciden con el archivo de reglas del repositorio; no se desplegaron reglas en esta revisión.
- La matriz directa con identidades temporales de Firebase Auth confirmó en Staging aislamiento José/Camila; acceso adulto a Leah y sincronización visible entre las dos sesiones tras un inicio de sesión nuevo; tarea infantil pending → awaiting_review, edición pendiente y edición después de devolución adulta; rechazo de borrado infantil y escritura infantil en `shared/main`; aprobación adulta; y bloqueo infantil de documentos privados Salud/Gastos. Las cuentas, membresías y documentos de prueba se limpiaron.
- Una migración sintética en workspace aleatorio validó en Staging el fallo atómico (sin sanitizar tablero ni crear privados/marcador) y el lote válido (sanitiza tablero, separa Salud/Gastos y establece el marcador). El child no pudo leer antes del marcador; después leyó únicamente el tablero limpio y no los documentos privados. El fixture se limpió.
- La verificación fue API autenticada directa, no una prueba end-to-end iniciada desde la interfaz. Persisten pendientes el login desde el formulario del preview, el diagnóstico visual, móvil/WebView y el ciclo offline/reconexión. La comprobación del emulador no sustituye esas pruebas.
- Producción tiene reglas activas que deniegan todas las operaciones; el cliente público publicado en GitHub Pages sigue siendo el cliente antiguo, sin Firebase Auth ni ID token. No cambiar reglas hasta coordinar migración y reemplazo del cliente.
- La integración visual en escritorio/móvil y las pruebas de WebView deben completarse. La cuenta infantil real permanece deshabilitada.

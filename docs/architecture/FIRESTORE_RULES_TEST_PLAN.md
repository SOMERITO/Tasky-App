# Plan de pruebas — reglas multi-espacio

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
- Leah lee `workspaces/leah/shared/main`.
- Leah crea una solicitud `new_task` válida en `workspaces/leah/task_requests`.
- Leah crea una solicitud `completion` válida.
- Todos los miembros leen notificaciones del espacio Leah.
- José o Camila (guardian) pueden crear notificaciones compartidas válidas.

## Debe rechazarse
- Visitante lee o escribe cualquier workspace.
- José lee o escribe `workspaces/camila/**`.
- Camila lee o escribe `workspaces/jose/**`.
- Leah lee `workspaces/leah/adult_private/**`.
- Leah crea, actualiza o elimina `workspaces/leah/shared/main`.
- Leah actualiza o elimina cualquier solicitud después de crearla.
- Leah crea una solicitud con `createdBy` de otro UID, estado distinto de `pending`, campos no permitidos o tipo desconocido.
- Usuario miembro de un workspace consulta uno donde no tiene membresía.
- Leah crea una notificación compartida (solo los adultos pueden generarlas).

## Verificación en la aplicación
- Cerrar sesión elimina el tablero visible y el estado del workspace activo.
- Cambiar de espacio descarga el estado del siguiente workspace antes de renderizar.
- El token de Firebase Authentication acompaña todas las solicitudes a Firestore.
- No existe publicación, lectura o SSE en ntfy.sh.

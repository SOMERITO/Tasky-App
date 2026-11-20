# Plan de pruebas — reglas multi-espacio

Fecha de actualización: 20 de noviembre de 2026.

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
- Un adulto revisa una solicitud pendiente y actualiza únicamente los campos de revisión.
- Un adulto aprueba una solicitud `new_task` mediante una transacción que incorpora la tarea en `shared/main` y marca la solicitud como aprobada.
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
- El acceso infantil permanece deshabilitado hasta validar el aislamiento de Salud y Gastos en staging.

## Resultado CI más reciente
- Firestore Emulator: **11 aprobadas, 0 fallidas**.
- Comprobación de sintaxis JavaScript y ausencia de referencias `ntfy.sh`: aprobada.

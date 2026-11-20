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
- Leah lee `workspaces/leah/shared/main` únicamente cuando existe `access_control/private_modules` con `ready: true` y `schemaVersion: 1`.
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
- Leah lee o escribe `workspaces/leah/adult_private/**`.
- Leah o un visitante lee o modifica `workspaces/leah/access_control/private_modules`.
- Una membresía child habilitada lee `shared/main` o `task_requests` antes de completar la migración privada.
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
- La aplicación crea `adult_private/health`, `adult_private/expenses` y sanitiza `shared/main` en una misma transacción; el marcador se escribe solo al completar esa operación.
- Un documento `shared/main` existente pero ilegible bloquea la migración y no crea el marcador.
- El acceso infantil permanece deshabilitado hasta validar el aislamiento completo de Salud y Gastos en staging.

## Pruebas de navegador del acceso
- La pantalla inicial muestra José, Cams y Leah antes de mostrar el formulario de credenciales.
- La selección del perfil no otorga permisos: la cuenta autenticada debe tener una membresía activa para ese espacio.
- José puede elegir José y entrar como owner.
- Cams puede elegir Cams y entrar como owner.
- José puede elegir Leah y entrar como guardian.
- La cuenta infantil de Leah no entra mientras `childAccessEnabled` siga deshabilitado.
- Una cuenta sin membresía para el perfil elegido recibe acceso denegado.
- El fixture de navegador bloquea las llamadas a endpoints reales de Firebase y no carga el motor de sincronización de producción.

## Resultado CI más reciente
- GitHub Actions Auth + Firestore Emulator + Chromium: **25 aprobadas, 0 fallidas** (ejecución #115; incluye 6 pruebas de navegador para el selector previo de perfiles).
- Tasky Security Checks: **aprobada** (ejecución #69).
- Las pruebas usan identidades y membresías ficticias en emuladores locales; no modifican Firebase real.
- La integración visual y la migración de datos reales aún requieren validación en staging; no habilitar la cuenta infantil.

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
- Además, el marcador solo habilita su acceso si existen `adult_private/health` y `adult_private/expenses`, cada uno con su `moduleId`, `schemaVersion: 1` y payload que identifica el módulo correspondiente.
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
- Una membresía child lee `shared/main` cuando falta Salud/Gastos, el sobre del documento no coincide con el módulo, o la puerta de migración fue cerrada por fallo de integridad.
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
- La creación de documentos nuevos exige precondición `exists: false` y una lectura confirmatoria que coincida con el payload escrito y devuelva `updateTime` antes de mostrar sincronización confirmada.
- Un documento `shared/main` existente pero ilegible bloquea la migración y no crea el marcador.
- Un marcador listo exige los dos documentos privados válidos. El guardado vuelve a verificar la puerta y ambos documentos dentro de la misma transacción. Si una lectura/listener detecta un documento ausente o corrupto, se detiene la sincronización privada y se intenta cerrar la puerta con `integrityFailure`; no se reconstruyen módulos vacíos.
- La validación local de integridad de `payloadJson` detecta JSON corrupto y sus campos internos. Las reglas no analizan JSON arbitrario; también exigen el identificador del módulo dentro del payload como condición de lectura infantil.
- El acceso infantil permanece deshabilitado hasta validar el aislamiento completo de Salud y Gastos en staging.

## Pruebas de navegador del acceso
- La pantalla inicial muestra primero el formulario de correo y contraseña.
- Después de autenticar, el selector contiene únicamente las membresías activas del UID.
- José ve solo José y Leah; Camila ve solo Cams y Leah; Leah ve solo Leah.
- Una cuenta sin membresías no puede seleccionar ningún espacio.
- La cuenta infantil de Leah no entra mientras `childAccessEnabled` siga deshabilitado.
- Una cuenta sin membresía para el perfil elegido recibe acceso denegado.
- El fixture de navegador bloquea las llamadas a endpoints reales de Firebase y no carga el motor de sincronización de producción.

## Resultado CI actualizado

- HEAD actual `f31d0850e0e8198fd93dca2f18970dcca54cec24`: Firestore/Auth + Chromium #421 aprobó **46/46** pruebas de emulador/navegador; la suite Node local aprobó **22/22**; la prueba REST de precondiciones aprobó **1/1**; Tasky Security Checks #224 aprobó.
- Ejecuciones: [Firestore/Auth + Chromium #421](https://github.com/SOMERITO/Tasky-App/actions/runs/45424897712) y [Tasky Security Checks #224](https://github.com/SOMERITO/Tasky-App/actions/runs/45424897879).
- Las pruebas de integridad de módulos privados validan documentos ausentes/corruptos, bloqueo de guardados inseguros y cierre de la puerta infantil. Las pruebas de respaldo nuevas verifican ida/vuelta de casillas, tareas, historial, configuración, memoria, objetivos, plan de enfoque, finalizaciones, cumpleaños y tombstones; también comprueban compatibilidad con respaldos JSON antiguos.
- La importación de José está limitada al proyecto `tasky-staging-82acb`. Antes de sustituir un documento existente exige un `payloadJson` reconocible, conserva el documento Firestore completo y la carga anterior como recuperación local, usa precondición de revisión y exige igualdad exacta del `payloadJson` y `updateTime` después de la escritura.
- El preview publicado y verificado anteriormente (`codex-tasky-72978d8`, SHA `72978d84bf96d66fda4c9692e4eddafc4162e510`) **no corresponde al HEAD actual** `f31d085`. Hace falta publicar un preview nuevo y repetir las pruebas de interfaz y sincronización entre sesiones en la versión actual.
- Las pruebas automatizadas usan identidades y datos sintéticos. No prueban la sesión real de las cuentas familiares ni alteran Firestore de producción.
- Producción continúa sin cambios: no se habilitaron reglas, no se migró el documento legado y no se fusionó el PR.

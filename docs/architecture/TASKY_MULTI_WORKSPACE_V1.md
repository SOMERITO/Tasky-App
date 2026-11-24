# Tasky — arquitectura multi-espacio (v1)

Fecha: 24 de noviembre de 2026
Estado: implementación en revisión en PR #5, HEAD `f31d0850e0e8198fd93dca2f18970dcca54cec24`; abierto y en borrador. Las protecciones Cloud First seleccionadas del PR #3 están integradas en esta rama. CI del HEAD actual aprobó: 22/22 pruebas Node, 46/46 pruebas Firestore/Auth/Chromium, 1/1 prueba REST de precondiciones y Tasky Security Checks #224. El preview de Staging publicado documentado es anterior (SHA `72978d8`); la interfaz de este HEAD aún debe publicarse y verificarse en Staging.

## Objetivo

Mantener una sola aplicación web y una sola URL de Tasky. La pantalla inicial solicita primero correo y contraseña. Después de autenticar la identidad, Tasky consulta las membresías de ese UID y muestra exclusivamente los espacios autorizados. La selección posterior nunca concede permisos por sí sola. Los datos, permisos, preferencias y cachés de cada espacio deben estar aislados.

No se creará una segunda página web para Leah ni se reutilizará otra aplicación móvil. Tasky Leah será un espacio compartido dentro de la aplicación actual.

## Decisiones confirmadas

- Aplicación única y URL actual de Tasky José.
- Pantalla inicial única de autenticación: correo y contraseña.
- Después de autenticar, selector dinámico que muestra únicamente las membresías activas del UID; no ofrece perfiles ajenos.
- La cuenta autenticada debe tener una membresía activa en el workspace seleccionado; el nombre visible no es una credencial ni una autorización.
- Sin registro público: las tres cuentas se provisionarán por el administrador; no habrá botón de auto-registro.
- Espacios:
  - `jose`: solo José; privado.
  - `camila`: solo Camila; privado.
  - `leah`: José (guardian), Camila (guardian), Leah (child); compartido.
- Colores de Tasky Leah: rosado, morado y negro.
- Módulos previstos de Leah: Escolar, Evaluaciones, Materiales, Actividades, Coordinación familiar, Salud y citas, Hábitos y rutinas y Gastos relacionados con Leah.
- Los módulos Salud y Gastos se separan en documentos independientes `adult_private/health` y `adult_private/expenses`. La cuenta infantil continúa deshabilitada hasta completar migración, validar los documentos y pruebas.
- Coordinación familiar: compartida con los tres.
- Sincronización familiar: el panel de José y Camila escucha en tiempo real las tareas propias de Leah (`child_tasks`) y las solicitudes de confirmación de tareas creadas por adultos (`task_requests`). Las notificaciones fuera de la aplicación o con Tasky cerrado siguen pendientes.
- Leah: puede crear tareas propias directamente, sin aprobación; puede editar solo las tareas que ella creó mientras estén pendientes; no puede eliminarlas ni modificar las creadas por los adultos.
- Leah puede indicar que terminó una tarea propia. El estado pasa a `awaiting_review`, se muestra tachada y permanece visible; no se marca como completada ni se retira de pendientes hasta que José o Camila aprueben.
- José o Camila pueden aprobar (estado `completed`) o devolver la tarea a pendiente. Solo ellos pueden confirmar la finalización oficial.
- Para tareas que José o Camila crean en el tablero compartido, Leah puede enviar una solicitud de confirmación; el tablero solo se actualiza cuando un adulto aprueba.
- Los adultos pueden administrar los datos compartidos de Leah.

## Roles y espacios

| Cuenta | Espacio | Rol | Acceso |
|---|---|---|---|
| José | jose | owner | Lectura y escritura completas |
| Camila | camila | owner | Lectura y escritura completas |
| José | leah | guardian | Lectura y escritura completas |
| Camila | leah | guardian | Lectura y escritura completas |
| Leah | leah | child | Lectura compartida; crea y edita solo sus tareas pendientes; puede avisar que terminó; no borra ni edita tareas de adultos ni aprueba finalizaciones |

Los UID y correos reales se asignarán cuando se creen las cuentas en Firebase Authentication. No se deben inventar ni guardar contraseñas en el repositorio.

## Proyectos Firebase y entornos

Los tres espacios (José, Cams y Leah) pertenecen a una sola aplicación y al mismo proyecto Firebase de producción `tasky-7a30c`; no se crea un proyecto distinto por integrante. Para validar cambios sin tocar los datos reales, se creó el proyecto independiente de pruebas `tasky-staging-82acb`. La rama de desarrollo usa el alias `staging`; las reglas deben probarse e instalarse primero allí.

Antes de reabrir Firestore, la aplicación debe:
1. Mostrar primero el formulario de correo y contraseña.
2. Autenticar al usuario con Firebase Authentication.
3. Obtener y renovar el ID token de Firebase.
4. Enviar el token como `Authorization: Bearer <ID_TOKEN>` en cada solicitud Firestore REST (o utilizar el SDK de Firebase).
5. Leer las membresías del UID autenticado y mostrar únicamente los espacios activos asignados.
6. Al seleccionar un espacio, comprobar de nuevo la membresía; rechazar cualquier espacio sin autorización.
7. Nunca confiar en un nombre de perfil, una opción del navegador o un workspaceId enviado por el cliente como autorización.

La API key del cliente identifica el proyecto, pero no reemplaza la autenticación ni las reglas. No incluir credenciales de cuentas de servicio, claves privadas ni tokens en el código.

## Sincronización Cloud First y recuperación

- Firestore es la fuente remota autoritativa. Los mensajes entre pestañas/dispositivos solo notifican que hay que volver a leer Firestore; no aplican una copia local recibida por `storage`.
- Cada escritura normal usa `documents:commit` con `currentDocument.updateTime`. La creación inicial requiere la autorización explícita de rescate y la precondición `exists: false`; una revisión ausente bloquea la escritura.
- Ante conflicto o rechazo, Tasky descarta la revisión conocida y vuelve a leer antes de conciliar y reintentar. Si la lectura, el respaldo o la conciliación falla, no sube el resultado.
- Los borrados se conservan como `deletedTaskUpdatedAt` y `deletedBoxUpdatedAt`. Al conciliar cambios locales pendientes, una eliminación sin versión procedente de una caché antigua se ignora; las eliminaciones versionadas se comparan con las últimas versiones de tareas/casillas y de las tareas hijas de una casilla. Una edición/recreación posterior puede volver a habilitar el elemento.
- Antes de adoptar una copia remota distinta o conciliar cambios locales pendientes, la aplicación guarda una copia local recuperable. Si no puede guardarla, bloquea la adopción/escritura.
- El formato compacto también transporta las versiones de los tombstones. Las cargas de Salud y Gastos se filtran del documento compartido y sus borrados versionados se mantienen en los documentos privados de adultos.
- La suite de reglas y autenticación usa Firebase Emulator. La aceptación de precondiciones REST usa una configuración separada de emulator y una ruta sintética; esas reglas abiertas no forman parte de `firebase.json` de despliegue.

## Modelo de datos propuesto

```text
user_access/{uid}/workspaces/{workspaceId}
  role: "owner" | "guardian" | "child"
  active: true
  workspaceId: "jose" | "camila" | "leah"
  displayName: "Tasky Leah"

workspaces/{workspaceId}
  name, type, createdAt, schemaVersion

workspaces/{workspaceId}/shared/main
  payloadJson: ...
  updatedAt: ...
  deviceId: ...

workspaces/leah/adult_private/health
  appointments, adultNotes, privateDetails

workspaces/leah/adult_private/expenses
  expenseDetails, amounts, payer, receipts

workspaces/leah/access_control/private_modules
  ready: true
  schemaVersion: 1
  migrationVersion: "20261120-private-health-expenses-1"

El marcador `ready: true` solo se considera completado cuando existen los dos documentos privados y ambos tienen `moduleId`, `schemaVersion: 1` y payload válido. Cada inicialización ya completada es de solo lectura; guardados y listeners verifican de nuevo marcador y documentos. Ante ausencia o corrupción, la sincronización se bloquea y el cliente intenta cerrar la puerta con `integrityFailure`; no crea módulos vacíos.

workspaces/leah/task_requests/{requestId}
  type: "completion"
  createdBy, createdAt, status: "pending"
  relatedTaskId

workspaces/leah/child_tasks/{taskId}
  Tareas creadas directamente por Leah; se reflejan en tiempo real a los adultos.
  La cuenta infantil edita solo sus propios registros en estado pending y puede pasarlos a awaiting_review.
  La aprobación adulta cambia el estado a completed; el rechazo lo devuelve a pending.

workspaces/leah/notifications/{notificationId}
  eventType, title, createdAt, createdBy, audience
```

Los datos privados de salud y gastos van en documentos separados: Firestore Rules autorizan documentos completos, no campos individuales de un mismo documento. No incluir detalles privados de adultos dentro de `shared/main`. El administrador de la aplicación extrae los datos antiguos de `shared/main` y los mueve en una transacción a `adult_private/health` y `adult_private/expenses`, dejando el tablero compartido sanitizado y un marcador `access_control/private_modules` con `ready: true`, `schemaVersion: 1`. Si el documento compartido existe pero su copia no se puede interpretar, la migración se detiene sin crear el marcador ni permitir el acceso infantil. Además, las reglas bloquean toda membresía infantil hasta que exista ese marcador, incluso si alguien activa accidentalmente `childAccessEnabled` antes de tiempo.

## Permisos de Firestore

- `user_access/{uid}/workspaces/{workspaceId}`: lectura únicamente por el propio UID; altas y cambios de membresías solo mediante la consola o un entorno administrativo confiable.
- `workspaces/{workspaceId}`: lectura para miembros activos; escritura administrativa únicamente.
- `workspaces/{workspaceId}/shared/{docId}`: lectura para miembros activos; escritura para owner/guardian.
- `workspaces/{workspaceId}/adult_private/{docId}`: lectura y escritura solo para owner/guardian.
- `workspaces/{workspaceId}/access_control/{controlId}`: lectura y escritura solo para owner/guardian; el marcador de migración debe existir antes de que una membresía child pueda leer datos compartidos.
- `workspaces/leah/child_tasks/{taskId}`: lectura para miembros activos de Leah; Leah puede crear registros propios y editar solo su contenido mientras estén pendientes; puede cambiarlos a `awaiting_review`; solo owner/guardian puede devolverlos a pendiente, completar oficialmente o eliminarlos.
- `workspaces/{workspaceId}/task_requests/{requestId}`: lectura para miembros activos; Leah puede crear únicamente solicitudes de confirmación para tareas del tablero de adultos; solo owner/guardian puede aprobar, rechazar, editar o eliminar solicitudes.
- `workspaces/{workspaceId}/notifications/{notificationId}`: lectura para todos los miembros; creación validada por la aplicación y las reglas; sin acceso de usuarios externos.
- Denegar todo documento que no esté permitido explícitamente.

### Flujo de Leah para tareas

1. Leah registra una tarea propia: se guarda directamente en `workspaces/leah/child_tasks` en estado `pending`, sin aprobación previa.
2. José y Camila escuchan esa colección con Firestore `onSnapshot`; el nuevo registro o una edición aparece en tiempo real en su panel familiar.
3. Leah puede editar únicamente sus propias tareas mientras estén en estado `pending`. No puede borrar tareas ni modificar las creadas por los adultos.
4. Cuando Leah pulsa «Ya terminé», el documento pasa a `awaiting_review`. La tarea permanece visible y se presenta tachada, pero no se registra como completada en el tablero ni en las estadísticas oficiales.
5. José o Camila revisan la tarea. «Aprobar y completar» cambia el estado a `completed` y registra quién y cuándo confirmó; «Devolver a pendientes» vuelve a `pending` para que Leah pueda editarla o terminarla de nuevo.
6. Para tareas creadas por los adultos en el tablero principal, Leah puede enviar una solicitud `completion`; solo la aprobación adulta cambia el campo `done` del tablero compartido.
7. Los permisos se aplican en Firestore Rules, no solo mediante controles visuales. La cuenta infantil nunca escribe el documento completo `shared/main`.

Las tareas propias de Leah se mantienen en una colección separada para evitar que la cuenta infantil reemplace o altere el documento JSON completo del tablero compartido. El panel familiar muestra esos registros y los adultos los reciben mediante suscripción en tiempo real.
## Aislamiento en el navegador

El código actual aplica un namespace al almacenamiento local al seleccionar un espacio: `tasky:v2:{workspaceId}:...`; el espacio Leah añade además el UID autenticado. La configuración de Firebase es global porque determina el destino del cliente. Las claves legacy se leen únicamente para José; el espacio adulto de Leah puede migrar claves legacy de su namespace anterior, y el rol child no lee esas claves. No copiar claves legacy a Camila ni al espacio infantil.

La selección del espacio recarga el documento autorizado y el namespace local correspondiente; el cambio de sesión reinicia la aplicación y el área autenticada se mantiene bloqueada hasta autenticar. La matriz de cambio de espacio, cierre de sesión y persistencia entre sesiones todavía debe completarse en Staging con cuentas ficticias.

## Notificaciones

La primera versión implementará un centro de notificaciones dentro de Tasky, visible a todos los integrantes de Leah. Las notificaciones nativas del navegador serán opt-in por dispositivo y fase posterior; no prometer avisos en segundo plano mientras la app esté cerrada.

## Migración de Tasky José

- Conservar el respaldo JSON exportado por José.
- Mantener intacto el documento anterior `tasky_sync/somerito_main`; no borrarlo ni sobrescribirlo durante la migración.
- El documento legado existe en producción. Una copia de seguridad de solo lectura se guardó localmente con permisos restringidos; no se importó ni modificó. Las reglas activas de producción consultadas el 23 de noviembre de 2026 deniegan toda lectura y escritura (`allow read, write: if false`), por lo que el cliente antiguo no puede sincronizar con ese documento.
- El espacio nuevo de José que responde 404 queda en `Migración pendiente`; no se crea desde la caché ni se consulta automáticamente el documento legado.
- El importador explícito requiere una sesión autenticada en Staging, valida el JSON, presenta conteos y destino, pide confirmación, conserva el documento remoto Firestore completo como copia de recuperación y escribe con precondición `updateTime` o `exists: false`. La lectura posterior exige el mismo `updateTime` y compara el `payloadJson` completo, incluidas historia, configuración, memoria y metadatos durables.
- El importador actual está deliberadamente limitado a Staging. La restauración de la copia de recuperación y el procedimiento de producción requieren una fase operativa aparte; no se importó el respaldo real.
- Mantener intacto el documento anterior `tasky_sync/somerito_main`; ninguna operación de migración lo lee o modifica.
- No reabrir el documento anterior con reglas públicas.

## Estado de validación de entornos (23 de noviembre de 2026)

- El canal temporal `codex-tasky-72978d8` se publicó en Firebase Hosting del proyecto `tasky-staging-82acb` desde el SHA anterior `72978d84bf96d66fda4c9692e4eddafc4162e510`. URL: `https://tasky-staging-82acb--codex-tasky-72978d8-stfm6qrl.web.app` (vence el 29 de noviembre de 2026). **No representa el HEAD actual `f31d085`** y no debe usarse como aceptación de la última compilación.
- La página y la configuración cargan con HTTP 200. En runtime, el hostname de ese preview selecciona `TaskyFirebaseEnvironment.name === "staging"` y `projectId === "tasky-staging-82acb"`. Se comprobó el formulario de acceso y que el panel familiar está antes del tablero. La pantalla de acceso no se automatizó con esas cuentas; el flujo Firebase Auth/Firestore se validó mediante solicitudes autenticadas con identidades ficticias.
- Las reglas activas de Staging coinciden con `firebase/firestore.rules`; no se desplegaron reglas durante esta revisión.
- La matriz autenticada creó cuentas y documentos sintéticos temporales y los eliminó al terminar: adultos solo leen/escriben su espacio; José y Camila leen/escriben Leah y ven cambios cruzados después de un inicio de sesión nuevo; el intento José→Camila y Camila→José fue denegado. La sincronización adulta persistió en Firestore después de volver a iniciar sesión.
- Leah sintética creó y editó una tarea pendiente, la envió a revisión y pudo volver a editarla después de que un adulto la devolviera a pendientes. El rol child no pudo escribir `shared/main` ni borrar su tarea; un adulto pudo revisar/aprobarla. Leah recibió denegación al leer documentos ficticios de Salud y Gastos privados.
- En un workspace sintético aislado se probó la migración con un `documents:commit` atómico: un lote que incluía una escritura no autorizada falló sin cambiar el documento legado ni crear los documentos privados o el marcador; el lote válido sanitizó el tablero, separó Salud/Gastos y creó `ready: true`. La cuenta child quedó bloqueada antes del marcador; después solo pudo leer el tablero sanitizado y siguió sin acceso a los módulos privados. El workspace y las identidades temporales se limpiaron.
- CI del HEAD `f31d0850e0e8198fd93dca2f18970dcca54cec24`: Firestore/Auth + Chromium #421 aprobó 46/46; Node local en CI aprobó 22/22; prueba REST de precondiciones aprobó 1/1; Tasky Security Checks #224 aprobó. Ejecuciones: https://github.com/SOMERITO/Tasky-App/actions/runs/45424897712 y https://github.com/SOMERITO/Tasky-App/actions/runs/45424897879.
- La URL pública de GitHub Pages (`somerito.github.io/Tasky-App/`) sirve los mismos bytes de `index.html` y `app.js` que `origin/main`. El cliente público aún usa `tasky_sync/somerito_main`, no carga `tasky-auth.js` y no envía ID token en sus solicitudes REST.
- No se cambiaron reglas ni datos de producción. La cuenta real de Leah sigue deshabilitada; no se importó el respaldo personal.

## Fases de implementación

1. **Implementado en PR #5:** modelo multi-espacio, reglas de acceso, autenticación, membresías consultadas por UID, namespaces locales y permisos infantiles. PR abierto en borrador.
2. **Integrado y cubierto por CI:** conciliación Cloud First, respaldos locales antes de adoptar, tombstones versionados, commits Firestore con precondición `updateTime` y relectura tras conflicto.
3. **Cubierto por emuladores/CI:** roles y reglas, flujo de Leah, privacidad de Salud/Gastos, migración sintética y rechazo de escrituras con revisión obsoleta.
4. **Validación funcional anterior en Staging con Auth/Firestore REST:** aislamiento de José/Camila, sincronización y persistencia entre sesiones, permisos de Leah para tareas, separación Salud/Gastos y migración sintética atómica con caso de fallo. Esa evidencia corresponde al preview anterior `72978d8`; los datos e identidades de prueba se limpiaron.
5. **Pendiente para el HEAD actual:** publicar un preview nuevo desde `f31d085`, iniciar sesión desde su formulario con las cuentas de prueba y repetir la validación de sincronización entre dos sesiones. Después completar escritorio, móvil y WebView/Median.co, incluido offline/reconexión.
6. **Pendiente antes de producción:** coordinar una migración reversible del documento legado y una publicación conjunta del cliente y reglas; probar compatibilidad de clientes antiguos. No publicar reglas actuales del PR antes de esa coordinación.

## Criterios mínimos de aceptación

- Una persona sin sesión no puede leer ni escribir ningún documento.
- José no puede leer documentos de Camila ni de Leah fuera de su membresía.
- Camila no puede leer documentos de José.
- Los tres miembros autorizados pueden leer los datos compartidos de Leah.
- Leah no puede leer ni escribir documentos `adult_private`.
- Leah no puede modificar `shared/main`, editar o borrar tareas adultas, borrar tareas propias ni establecer directamente el estado `completed`.
- Leah puede crear tareas propias sin aprobación y editarlas solo mientras estén pendientes.
- Una tarea marcada por Leah queda en `awaiting_review` y permanece visible/tachada hasta que un adulto la aprueba o la devuelve a pendientes.
- Un usuario externo no puede enumerar membresías ni consultar espacios.
- Al cerrar sesión no quedan datos de otro espacio visibles en memoria o pantalla.
- No se publicará ningún cambio en producción hasta pasar las pruebas anteriores y comprobar la sincronización real.

## Límites de esta fase

Este documento no habilita Firebase Authentication en producción ni crea cuentas reales. El preview documentado es de un SHA anterior; el HEAD actual no se ha desplegado a Staging. No habilitar la cuenta real de Leah ni cambiar las reglas de producción mientras falten la publicación y pruebas del HEAD actual, la verificación de respaldo/restauración del documento legado y el plan reversible de migración.

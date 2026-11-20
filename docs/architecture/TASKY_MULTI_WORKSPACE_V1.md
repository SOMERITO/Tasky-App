# Tasky — arquitectura multi-espacio (v1)

Fecha: 20 de noviembre de 2026  
Estado: implementación parcial en la rama de desarrollo; no desplegada.

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

El código actual utiliza claves locales globales como `tasky_data`, `tasky_settings`, `tasky_backups`, `tasky_history`, `tasky_task_memory` y otras. Antes de habilitar multi-espacio deben migrarse a claves versionadas y separadas, por ejemplo:

- `tasky:v2:jose:data`
- `tasky:v2:jose:settings`
- `tasky:v2:camila:data`
- `tasky:v2:leah:data`

La migración de claves antiguas se ejecutará únicamente al entrar autenticado al espacio `jose`, con copia previa y verificación. Nunca copiar los datos existentes a Camila o Leah. Al cambiar de espacio se debe limpiar el estado en memoria, cancelar listeners y cargar únicamente el espacio seleccionado. Cerrar sesión debe limpiar el estado activo y bloquear la pantalla.

## Notificaciones

La primera versión implementará un centro de notificaciones dentro de Tasky, visible a todos los integrantes de Leah. Las notificaciones nativas del navegador serán opt-in por dispositivo y fase posterior; no prometer avisos en segundo plano mientras la app esté cerrada.

## Migración de Tasky José

- Conservar el respaldo JSON exportado por José.
- Mantener intacto el documento anterior `tasky_sync/somerito_main`; no borrarlo ni sobrescribirlo durante la migración.
- El documento viejo permanece inaccesible con las reglas temporales actuales.
- Una vez desplegada la autenticación y probadas las reglas, importar el respaldo JSON validado al nuevo destino `workspaces/jose/shared/main` con la sesión de José.
- Comparar número de casillas, tareas y campos críticos antes de considerar terminada la migración.
- No reabrir el documento anterior con reglas públicas.

## Fases de implementación

1. **Fundación de seguridad (esta rama):** modelo de datos, reglas propuestas y pruebas negativas.
2. **Autenticación:** correo y contraseña primero; recuperación y cierre de sesión; sin auto-registro.
3. **Membresías y autorización:** después de autenticar, mostrar únicamente los espacios activos del UID; el selector no concede acceso por sí solo.
4. **Aislamiento local/cloud:** prefijos por workspace, Firestore con ID token y carga/guardado de documentos separados.
5. **Flujo infantil:** en actualización en esta rama: registro directo de tareas propias, edición limitada, aviso de finalización, revisión adulta y escucha en tiempo real; pendiente de ejecución de CI y validación funcional en staging.
6. **Privacidad por módulo:** capa de aislamiento y migración transaccional implementadas en esta rama; pendientes pruebas integrales de aplicación y staging antes de habilitar a Leah.
7. **Migración y despliegue:** importar copia de José, probar y solo después abrir reglas autenticadas.

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

Este documento no habilita Firebase Authentication en producción, no crea cuentas ni publica reglas en Firebase. El archivo de reglas de esta rama es una propuesta versionada para revisión y pruebas; no se debe publicar desde la consola hasta terminar la separación de datos privados, el staging y la validación integral.

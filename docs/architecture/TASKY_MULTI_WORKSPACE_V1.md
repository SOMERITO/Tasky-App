# Tasky — arquitectura multi-espacio (v1)

Fecha: 19 de noviembre de 2026  
Estado: propuesta de implementación en rama; no desplegada.

## Objetivo

Mantener una sola aplicación web y una sola URL de Tasky. Después de iniciar sesión, cada integrante verá únicamente los espacios autorizados. Los datos, permisos, preferencias y cachés de cada espacio deben estar aislados.

No se creará una segunda página web para Leah ni se reutilizará otra aplicación móvil. Tasky Leah será un espacio compartido dentro de la aplicación actual.

## Decisiones confirmadas

- Aplicación única y URL actual de Tasky José.
- Inicio de sesión individual con Firebase Authentication (correo y contraseña).
- Sin registro público: las tres cuentas se provisionarán por el administrador; no habrá botón de auto-registro.
- Espacios:
  - `jose`: solo José; privado.
  - `camila`: solo Camila; privado.
  - `leah`: José (guardian), Camila (guardian), Leah (child); compartido.
- Colores de Tasky Leah: rosado, morado y negro.
- Módulos de Leah: Escolar, Evaluaciones, Materiales, Actividades, Coordinación familiar, Salud y citas, Hábitos y rutinas y Gastos relacionados con Leah.
- Coordinación familiar: compartida con los tres.
- Notificaciones: todos los miembros del espacio deben recibir avisos dentro de la aplicación.
- Leah: puede registrar pendientes y solicitar que se marquen como completados; no puede eliminar pendientes de los adultos. La finalización requiere verificación de un adulto.
- Los adultos pueden administrar los datos compartidos de Leah.

## Roles y espacios

| Cuenta | Espacio | Rol | Acceso |
|---|---|---|---|
| José | jose | owner | Lectura y escritura completas |
| Camila | camila | owner | Lectura y escritura completas |
| José | leah | guardian | Lectura y escritura completas |
| Camila | leah | guardian | Lectura y escritura completas |
| Leah | leah | child | Lectura compartida; solicitudes de alta y finalización; sin borrado de tareas de adultos |

Los UID y correos reales se asignarán cuando se creen las cuentas en Firebase Authentication. No se deben inventar ni guardar contraseñas en el repositorio.

## Firebase: un único proyecto

Se mantiene el proyecto Firebase existente `tasky-7a30c`, que actualmente tiene Firestore bloqueado con `allow read, write: if false`. No crear otro proyecto para Leah.

Antes de reabrir Firestore, la aplicación debe:
1. Autenticar al usuario con Firebase Authentication.
2. Obtener y renovar el ID token de Firebase.
3. Enviar el token como `Authorization: Bearer <ID_TOKEN>` en cada solicitud Firestore REST (o utilizar el SDK de Firebase).
4. Leer los espacios permitidos desde el documento de acceso del UID autenticado.
5. Rechazar cualquier espacio sin una membresía activa.
6. Nunca confiar en el nombre del perfil o el workspaceId enviado por el navegador como autorización.

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

workspaces/leah/task_requests/{requestId}
  type: "new_task" | "completion"
  createdBy, createdAt, status: "pending"
  title/module/dates/priority OR relatedTaskId

workspaces/leah/notifications/{notificationId}
  eventType, title, createdAt, createdBy, audience
```

Los datos privados de salud y gastos van en documentos separados: Firestore Rules autorizan documentos completos, no campos individuales de un mismo documento. No incluir detalles privados de adultos dentro de `shared/main`. La membresía infantil debe llevar `childAccessEnabled: false` y solo podrá activarse después de implementar y probar la separación de datos privados del tablero compartido.

## Permisos de Firestore

- `user_access/{uid}/workspaces/{workspaceId}`: lectura únicamente por el propio UID; altas y cambios de membresías solo mediante la consola o un entorno administrativo confiable.
- `workspaces/{workspaceId}`: lectura para miembros activos; escritura administrativa únicamente.
- `workspaces/{workspaceId}/shared/{docId}`: lectura para miembros activos; escritura para owner/guardian.
- `workspaces/{workspaceId}/adult_private/{docId}`: lectura y escritura solo para owner/guardian.
- `workspaces/{workspaceId}/task_requests/{requestId}`: lectura para todos los miembros; Leah puede crear solicitudes validadas; solo owner/guardian puede aprobar, rechazar, editar o eliminar solicitudes.
- `workspaces/{workspaceId}/notifications/{notificationId}`: lectura para todos los miembros; creación validada por la aplicación y las reglas; sin acceso de usuarios externos.
- Denegar todo documento que no esté permitido explícitamente.

### Flujo de Leah para tareas

1. Leah registra un pendiente: se guarda como solicitud `new_task` con estado `pending`.
2. José y Camila reciben el aviso dentro del espacio compartido y revisan la solicitud.
3. Un adulto la aprueba y la incorpora al tablero compartido (o la rechaza con una explicación).
4. Cuando Leah termina una tarea, crea una solicitud `completion`.
5. El adulto verifica y actualiza el estado final en el tablero. Leah no modifica directamente el documento principal ni puede borrar una tarea adulta.

Así se conserva el motor actual, que serializa el tablero completo en un documento, sin conceder a la cuenta infantil permiso para sobrescribir o eliminar cualquier tarea de ese documento.

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
2. **Autenticación:** pantalla de inicio de sesión, persistencia segura de sesión, recuperación de contraseña y cierre de sesión; sin auto-registro.
3. **Membresías y selector:** cargar los espacios permitidos por UID y mostrar el selector.
4. **Aislamiento local/cloud:** prefijos por workspace, Firestore con ID token y carga/guardado de documentos separados.
5. **Flujo infantil:** solicitudes de nuevas tareas y finalización con aprobación de adulto.
6. **Privacidad por módulo:** documentos separados para salud y gastos de adultos.
7. **Migración y despliegue:** importar copia de José, probar y solo después abrir reglas autenticadas.

## Criterios mínimos de aceptación

- Una persona sin sesión no puede leer ni escribir ningún documento.
- José no puede leer documentos de Camila ni de Leah fuera de su membresía.
- Camila no puede leer documentos de José.
- Los tres miembros autorizados pueden leer los datos compartidos de Leah.
- Leah no puede leer ni escribir documentos `adult_private`.
- Leah no puede modificar `shared/main`, borrar tareas adultas o marcar una tarea como completada sin solicitud.
- Un usuario externo no puede enumerar membresías ni consultar espacios.
- Al cerrar sesión no quedan datos de otro espacio visibles en memoria o pantalla.
- No se publicará ningún cambio en producción hasta pasar las pruebas anteriores y comprobar la sincronización real.

## Límites de esta fase

Este documento no habilita Firebase Authentication, no crea cuentas ni modifica reglas en Firebase. El archivo de reglas de esta rama es una propuesta versionada para revisión y pruebas; no se debe publicar desde la consola hasta terminar la integración y ejecutar pruebas en el emulador.

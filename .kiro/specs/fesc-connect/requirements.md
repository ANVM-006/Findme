# Documento de Requisitos — FESC Connect

## Introduction

FESC Connect es una red social universitaria mobile exclusiva para estudiantes de la Universidad FESC. La plataforma permite a los estudiantes conocer personas, crear amistades, hacer networking académico, encontrar compañeros de estudio y establecer conexiones personales dentro del ecosistema universitario. A diferencia de aplicaciones como Tinder, FESC Connect no requiere un match mutuo para iniciar una conversación: cualquier usuario puede escribirle a otro directamente. El match mutuo desbloquea una categoría especial de conexión destacada (Conexión_Destacada). La app está diseñada con un enfoque mobile-first, modo oscuro por defecto y experiencia premium.

---

## Glosario

- **Sistema**: La plataforma FESC Connect en su conjunto (frontend mobile + backend API).
- **App**: La aplicación mobile de FESC Connect (React Native + Expo).
- **API**: El servidor backend NestJS que expone los endpoints REST y WebSocket.
- **Auth_Service**: Módulo responsable del registro, login, tokens y verificación de identidad.
- **Profile_Service**: Módulo responsable de la gestión del perfil de usuario.
- **Discovery_Engine**: Módulo responsable de sugerir perfiles a los usuarios (sistema Find).
- **Match_Service**: Módulo responsable de gestionar likes, matches mutuos e historial.
- **Chat_Service**: Módulo responsable de mensajería en tiempo real entre usuarios.
- **Recommendation_Engine**: Módulo responsable de calcular afinidad y sugerencias inteligentes.
- **Notification_Service**: Módulo responsable del envío de notificaciones push.
- **Moderation_Service**: Módulo responsable de reportes, bloqueos y seguridad de contenido.
- **Usuario**: Estudiante registrado y verificado en FESC Connect.
- **Perfil**: Conjunto de datos públicos y preferencias de un Usuario.
- **Like**: Acción de un Usuario que expresa interés en otro Perfil.
- **Match**: Estado que se produce cuando dos Usuarios se han dado Like mutuamente.
- **Conversación**: Hilo de mensajes entre dos Usuarios.
- **Correo_Institucional**: Dirección de correo electrónico con dominio `@fesc.edu.co`.
- **Token_de_Acceso**: JWT de corta duración usado para autenticar peticiones a la API.
- **Token_de_Refresco**: JWT de larga duración usado para obtener nuevos Token_de_Acceso.
- **Score_de_Compatibilidad**: Valor numérico (0–100) calculado por el Recommendation_Engine que representa la afinidad entre dos Usuarios.
- **Conexión_Destacada**: Categoría especial de relación entre dos Usuarios que han hecho Match mutuo.
- **Reporte**: Denuncia formal de un Usuario sobre el comportamiento o contenido de otro.
- **Bloqueo**: Acción que impide toda interacción entre dos Usuarios.
- **Push_Notification**: Notificación enviada al dispositivo móvil del Usuario mediante Expo Push Notifications.

---

## Requirements

### Requirement 1: Registro con Correo Institucional

**User Story:** Como estudiante de la FESC, quiero registrarme usando mi correo institucional, para que solo estudiantes verificados puedan acceder a la plataforma.

#### Acceptance Criteria

1. WHEN un usuario envía un formulario de registro con un correo que no termina en `@fesc.edu.co`, THEN THE Auth_Service SHALL rechazar el registro y retornar un mensaje de error indicando que solo se permiten correos institucionales.
2. WHEN un usuario envía un formulario de registro con un Correo_Institucional válido y una contraseña que cumple los requisitos mínimos de seguridad, THE Auth_Service SHALL crear la cuenta en estado pendiente de verificación y enviar un correo de verificación al Correo_Institucional proporcionado.
3. WHEN un usuario hace clic en el enlace de verificación dentro de las 24 horas siguientes al registro, THE Auth_Service SHALL activar la cuenta y permitir el acceso a la plataforma.
4. IF el enlace de verificación ha expirado (más de 24 horas desde su emisión), THEN THE Auth_Service SHALL retornar un error de enlace expirado y ofrecer la opción de reenviar el correo de verificación.
5. THE Auth_Service SHALL rechazar contraseñas con menos de 8 caracteres o que no contengan al menos una letra mayúscula, una minúscula y un número.
6. IF un Correo_Institucional ya está registrado en el sistema, THEN THE Auth_Service SHALL retornar un error indicando que la cuenta ya existe, sin revelar información adicional sobre el estado de la cuenta.

---

### Requirement 2: Autenticación y Gestión de Sesión

**User Story:** Como usuario registrado, quiero iniciar y cerrar sesión de forma segura, para que mi cuenta esté protegida en todo momento.

#### Acceptance Criteria

1. WHEN un usuario envía credenciales válidas (correo y contraseña), THE Auth_Service SHALL retornar un Token_de_Acceso con expiración de 15 minutos y un Token_de_Refresco con expiración de 30 días.
2. WHEN el Token_de_Acceso expira y el usuario realiza una petición autenticada, THE Auth_Service SHALL aceptar el Token_de_Refresco válido y emitir un nuevo Token_de_Acceso y un nuevo Token_de_Refresco (rotación de tokens).
3. IF un Token_de_Refresco ha sido revocado o no existe en el sistema, THEN THE Auth_Service SHALL retornar un error de autenticación y requerir que el usuario inicie sesión nuevamente.
4. WHEN un usuario cierra sesión, THE Auth_Service SHALL revocar el Token_de_Refresco activo e invalidar la sesión en el servidor.
5. THE App SHALL almacenar el Token_de_Acceso y el Token_de_Refresco exclusivamente en Expo Secure Store, nunca en AsyncStorage ni en memoria no segura.
6. WHILE el usuario tiene una sesión activa, THE App SHALL renovar el Token_de_Acceso de forma transparente antes de su expiración sin interrumpir la experiencia del usuario.
7. IF un usuario intenta iniciar sesión con credenciales incorrectas 5 veces consecutivas, THEN THE Auth_Service SHALL bloquear temporalmente los intentos de login desde esa IP durante 15 minutos y notificar al usuario del bloqueo temporal.

---

### Requirement 3: Recuperación de Contraseña

**User Story:** Como usuario, quiero recuperar el acceso a mi cuenta si olvido mi contraseña, para no perder mi perfil y conexiones.

#### Acceptance Criteria

1. WHEN un usuario solicita recuperación de contraseña con un Correo_Institucional registrado, THE Auth_Service SHALL enviar un correo con un enlace de restablecimiento válido por 1 hora.
2. IF el Correo_Institucional proporcionado no está registrado, THEN THE Auth_Service SHALL retornar una respuesta genérica de éxito para no revelar qué correos están registrados en el sistema.
3. WHEN un usuario accede al enlace de restablecimiento dentro del período de validez y proporciona una nueva contraseña válida, THE Auth_Service SHALL actualizar la contraseña, revocar todos los Token_de_Refresco activos de esa cuenta y confirmar el cambio al usuario.
4. IF el enlace de restablecimiento ha expirado o ya fue utilizado, THEN THE Auth_Service SHALL retornar un error descriptivo e invitar al usuario a solicitar un nuevo enlace.

---

### Requirement 4: Creación y Edición de Perfil

**User Story:** Como usuario, quiero crear y editar mi perfil con información personal y académica, para que otros estudiantes puedan conocerme y encontrar afinidades conmigo.

#### Acceptance Criteria

1. WHEN un usuario completa el onboarding inicial, THE Profile_Service SHALL requerir como campos obligatorios: nombre, edad, carrera, semestre y al menos una foto principal.
2. THE Profile_Service SHALL aceptar una galería de hasta 6 fotos por perfil, donde cada imagen no supere 10 MB y sea de formato JPG, PNG o WEBP.
3. WHEN un usuario guarda cambios en su perfil, THE Profile_Service SHALL validar todos los campos y persistir los cambios en menos de 2 segundos bajo condiciones normales de red.
4. THE Profile_Service SHALL permitir al usuario seleccionar intereses de las categorías: hobbies, áreas académicas, deportes, música, videojuegos, lectura, emprendimiento, tecnología, investigación e idiomas, con un máximo de 15 intereses seleccionados simultáneamente.
5. THE Profile_Service SHALL permitir al usuario definir sus preferencias sociales seleccionando una o más de las opciones: amistad, networking, estudio, relación, conversación casual.
6. IF un usuario intenta guardar un perfil con campos obligatorios vacíos, THEN THE Profile_Service SHALL retornar errores de validación específicos por campo sin persistir los cambios.
7. WHEN un usuario actualiza su foto principal, THE Profile_Service SHALL procesar y optimizar la imagen para reducir su tamaño sin pérdida visual perceptible antes de almacenarla.

---

### Requirement 5: Visualización de Perfil

**User Story:** Como usuario, quiero ver mi propio perfil y el de otros estudiantes, para conocer su información y decidir si quiero conectar con ellos.

#### Acceptance Criteria

1. THE App SHALL mostrar en el perfil propio: foto principal, galería, nombre, edad, carrera, semestre, ciudad, biografía, intereses y preferencias sociales.
2. WHEN un usuario visualiza el Perfil de otro Usuario, THE App SHALL mostrar la información pública del Perfil y el Score_de_Compatibilidad calculado entre ambos.
3. WHILE un Usuario está bloqueado por otro Usuario, THE App SHALL ocultar completamente el Perfil del usuario bloqueante al usuario bloqueado y viceversa.
4. THE Profile_Service SHALL calcular y exponer el porcentaje de completitud del perfil propio para motivar al usuario a completarlo.

---

### Requirement 6: Sistema de Descubrimiento (Find)

**User Story:** Como usuario, quiero descubrir perfiles de otros estudiantes de forma visual e intuitiva, para encontrar personas afines con quienes conectar.

#### Acceptance Criteria

1. WHEN un usuario abre la pantalla de descubrimiento, THE Discovery_Engine SHALL presentar una cola de perfiles sugeridos ordenados por Score_de_Compatibilidad descendente.
2. THE Discovery_Engine SHALL excluir de la cola de descubrimiento a: usuarios ya vistos en las últimas 24 horas, usuarios bloqueados por el Usuario actual, usuarios que han bloqueado al Usuario actual y el propio Usuario.
3. WHEN un usuario realiza la acción de Like sobre un Perfil sugerido, THE Match_Service SHALL registrar el Like y, si existe Like recíproco previo, crear un Match y notificar a ambos usuarios mediante Push_Notification.
4. WHEN un usuario realiza la acción de Pass sobre un Perfil sugerido, THE Discovery_Engine SHALL registrar el rechazo y no volver a mostrar ese Perfil al Usuario durante 7 días.
5. WHEN un usuario realiza la acción de Guardar sobre un Perfil sugerido, THE Profile_Service SHALL agregar ese Perfil a la lista de perfiles guardados del Usuario.
6. WHEN un usuario realiza la acción de Bloquear sobre un Perfil sugerido, THE Moderation_Service SHALL registrar el Bloqueo y ocultar mutuamente ambos perfiles de forma inmediata.
7. WHEN un usuario realiza la acción de Reportar sobre un Perfil sugerido, THE Moderation_Service SHALL registrar el Reporte con la categoría seleccionada y confirmar la recepción al Usuario.
8. THE Discovery_Engine SHALL calcular el Score_de_Compatibilidad considerando: intereses en común, carrera, semestre, preferencias sociales compatibles y actividad reciente del perfil sugerido.
9. IF la cola de perfiles sugeridos se agota, THEN THE Discovery_Engine SHALL notificar al Usuario que no hay más perfiles disponibles y sugerir ampliar los filtros de búsqueda.

---

### Requirement 7: Filtros de Descubrimiento

**User Story:** Como usuario, quiero filtrar los perfiles que se me muestran, para encontrar personas que se ajusten mejor a mis preferencias.

#### Acceptance Criteria

1. THE App SHALL permitir al usuario aplicar filtros de descubrimiento por: rango de edad, carrera, semestre y preferencias sociales.
2. WHEN un usuario aplica o modifica filtros, THE Discovery_Engine SHALL regenerar la cola de perfiles sugeridos aplicando los nuevos criterios en menos de 3 segundos.
3. THE Discovery_Engine SHALL persistir los filtros seleccionados por el usuario entre sesiones.
4. WHEN un usuario restablece los filtros a sus valores por defecto, THE Discovery_Engine SHALL regenerar la cola sin restricciones adicionales más allá de las exclusiones base definidas en el Requirement 6.

---

### Requirement 8: Sistema de Likes y Matches

**User Story:** Como usuario, quiero saber quién está interesado en mí y gestionar mis conexiones mutuas, para priorizar con quién quiero interactuar.

#### Acceptance Criteria

1. THE Match_Service SHALL mantener un historial de todos los Likes enviados y recibidos por el Usuario, paginado en bloques de 20 registros.
2. WHEN dos Usuarios se dan Like mutuamente, THE Match_Service SHALL crear una Conexión_Destacada entre ambos y enviar una Push_Notification a cada uno informando del Match.
3. THE App SHALL mostrar una sección "Personas interesadas en ti" donde el Usuario puede ver los perfiles que le han dado Like y elegir entre: devolver Like, ignorar, iniciar chat o descartar.
4. WHEN un usuario descarta un Like recibido, THE Match_Service SHALL registrar el descarte y no volver a mostrar ese perfil en la sección de interesados.
5. THE Match_Service SHALL calcular y mostrar el Score_de_Compatibilidad en la vista de cada Match para contextualizar la afinidad entre los usuarios.
6. THE App SHALL mostrar el historial de Matches ordenado por fecha de creación descendente, con indicador visual de si existe actividad reciente en la Conversación asociada.

---

### Requirement 9: Mensajería Directa (Chat)

**User Story:** Como usuario, quiero enviar y recibir mensajes con otros estudiantes sin necesidad de un match previo, para iniciar conversaciones libremente.

#### Acceptance Criteria

1. THE Chat_Service SHALL permitir a cualquier Usuario iniciar una Conversación con otro Usuario sin requerir un Match previo.
2. WHEN un usuario envía un mensaje de texto, THE Chat_Service SHALL entregar el mensaje al destinatario en tiempo real mediante WebSocket y confirmar la entrega al remitente.
3. WHILE el destinatario está conectado y tiene la Conversación abierta, THE Chat_Service SHALL marcar los mensajes como leídos y notificar al remitente mediante un indicador de lectura (read receipt).
4. WHEN el destinatario está escribiendo una respuesta, THE Chat_Service SHALL enviar un indicador de escritura (typing indicator) al remitente que desaparece tras 3 segundos de inactividad del destinatario.
5. THE Chat_Service SHALL permitir el envío de imágenes en formato JPG, PNG o WEBP con un tamaño máximo de 5 MB por imagen.
6. THE Chat_Service SHALL soportar el envío de emojis estándar Unicode en los mensajes de texto.
7. WHEN un usuario archiva una Conversación, THE Chat_Service SHALL mover esa Conversación a una sección de archivados sin eliminar el historial de mensajes.
8. WHEN un usuario elimina una Conversación, THE Chat_Service SHALL eliminar el historial de mensajes únicamente para ese Usuario, preservando los mensajes para el otro participante.
9. THE Chat_Service SHALL paginar el historial de mensajes de cada Conversación en bloques de 50 mensajes ordenados cronológicamente.
10. THE App SHALL mostrar el estado online/offline de cada participante en la cabecera de la Conversación, actualizando el estado en tiempo real mediante WebSocket.
11. WHEN un usuario bloquea a otro desde una Conversación, THE Moderation_Service SHALL registrar el Bloqueo, cerrar la Conversación activa y ocultar mutuamente los perfiles de forma inmediata.
12. THE App SHALL permitir buscar Conversaciones por nombre de usuario dentro de la bandeja de entrada.

---

### Requirement 10: Motor de Recomendaciones

**User Story:** Como usuario, quiero recibir sugerencias de perfiles cada vez más relevantes con el tiempo, para que la app aprenda mis preferencias y me conecte con personas afines.

#### Acceptance Criteria

1. THE Recommendation_Engine SHALL calcular el Score_de_Compatibilidad entre dos Usuarios considerando: número de intereses en común, compatibilidad de preferencias sociales, afinidad de carrera y semestre, y nivel de actividad reciente del perfil sugerido.
2. WHEN un usuario interactúa con perfiles (Like, Pass o inicio de chat), THE Recommendation_Engine SHALL actualizar el modelo de preferencias del Usuario para refinar futuras sugerencias.
3. THE Recommendation_Engine SHALL recalcular las sugerencias del Usuario al menos una vez cada 24 horas para incorporar nuevos perfiles y cambios de comportamiento.
4. THE Recommendation_Engine SHALL garantizar que el Score_de_Compatibilidad sea un valor entero entre 0 y 100 inclusive, donde 100 representa la máxima afinidad posible.
5. FOR ALL pares de Usuarios (A, B), THE Recommendation_Engine SHALL producir el mismo Score_de_Compatibilidad independientemente de si el cálculo se inicia desde el perfil de A o desde el perfil de B (propiedad de simetría del score).

---

### Requirement 11: Notificaciones Push

**User Story:** Como usuario, quiero recibir notificaciones en tiempo real sobre actividad relevante, para no perderme interacciones importantes.

#### Acceptance Criteria

1. THE Notification_Service SHALL enviar una Push_Notification al Usuario cuando ocurra alguno de los siguientes eventos: recibe un nuevo Like, se produce un Match, recibe un nuevo mensaje, alguien visita su perfil.
2. WHEN un usuario toca una Push_Notification, THE App SHALL navegar directamente a la pantalla correspondiente al evento notificado.
3. THE App SHALL solicitar permiso de notificaciones al usuario durante el onboarding y respetar la decisión del usuario sin volver a solicitarlo en la misma sesión.
4. THE Notification_Service SHALL respetar las preferencias de notificación configuradas por el Usuario, enviando únicamente los tipos de notificación que el Usuario haya habilitado.
5. IF el dispositivo del Usuario no está disponible en el momento del evento, THEN THE Notification_Service SHALL encolar la notificación y entregarla cuando el dispositivo vuelva a estar disponible, con un máximo de 72 horas de retención en cola.

---

### Requirement 12: Moderación y Seguridad de Contenido

**User Story:** Como usuario, quiero poder reportar y bloquear usuarios con comportamientos inapropiados, para sentirme seguro dentro de la plataforma.

#### Acceptance Criteria

1. THE Moderation_Service SHALL ofrecer al menos las siguientes categorías de Reporte: contenido inapropiado, acoso, spam, perfil falso y otro.
2. WHEN un usuario reporta a otro Usuario, THE Moderation_Service SHALL registrar el Reporte con: ID del reportante, ID del reportado, categoría, timestamp y descripción opcional, y confirmar la recepción al reportante.
3. IF un Usuario acumula 5 o más Reportes en un período de 7 días, THEN THE Moderation_Service SHALL aplicar shadow moderation al perfil del Usuario reportado, reduciendo su visibilidad en el Discovery_Engine sin notificar al Usuario afectado.
4. THE Moderation_Service SHALL limitar a cada Usuario el envío de un máximo de 50 mensajes por hora hacia usuarios con quienes no tiene Match, para prevenir comportamientos de spam.
5. THE Moderation_Service SHALL detectar y bloquear automáticamente mensajes que contengan patrones de spam conocidos: URLs repetidas o texto idéntico enviado a 3 o más usuarios distintos en menos de 5 minutos.
6. WHEN un usuario bloquea a otro, THE Moderation_Service SHALL ocultar mutuamente los perfiles, eliminar cualquier Like pendiente entre ambos y archivar las Conversaciones activas entre ellos de forma inmediata.
7. THE Moderation_Service SHALL mantener un registro de auditoría de todas las acciones de moderación (reportes, bloqueos, shadow bans) con timestamp y actor, accesible únicamente por administradores del sistema.

---

### Requirement 13: Seguridad de Datos y Privacidad

**User Story:** Como usuario, quiero que mis datos personales estén protegidos y que tenga control sobre mi privacidad, para confiar en la plataforma.

#### Acceptance Criteria

1. THE API SHALL aplicar autenticación mediante Token_de_Acceso en todos los endpoints que expongan o modifiquen datos de usuarios, rechazando peticiones sin token válido con un error HTTP 401.
2. THE Auth_Service SHALL almacenar las contraseñas de los usuarios usando el algoritmo Argon2id con parámetros de seguridad recomendados, nunca en texto plano ni con algoritmos débiles como MD5 o SHA-1.
3. THE API SHALL aplicar rate limiting de 100 peticiones por minuto por IP y 200 peticiones por minuto por usuario autenticado, retornando un error HTTP 429 al superar el límite.
4. THE Sistema SHALL transmitir todos los datos entre la App y la API exclusivamente mediante HTTPS con TLS 1.2 o superior.
5. THE Profile_Service SHALL permitir al usuario eliminar su cuenta y todos sus datos asociados de forma permanente, completando el proceso en menos de 30 días.
6. IF un Token_de_Acceso es utilizado desde una dirección IP diferente a la que lo generó dentro de la misma sesión, THEN THE Auth_Service SHALL registrar el evento como sospechoso y requerir reautenticación del usuario.

---

### Requirement 14: Rendimiento y Disponibilidad

**User Story:** Como usuario, quiero que la app sea rápida y esté disponible cuando la necesito, para tener una experiencia fluida y confiable.

#### Acceptance Criteria

1. THE API SHALL responder al 95% de las peticiones de lectura en menos de 500 ms bajo una carga de hasta 500 usuarios concurrentes.
2. THE Chat_Service SHALL entregar mensajes en tiempo real con una latencia máxima de 300 ms entre el envío y la recepción bajo condiciones normales de red.
3. THE Discovery_Engine SHALL generar una cola inicial de perfiles sugeridos en menos de 2 segundos para el 95% de las solicitudes.
4. THE App SHALL mostrar un estado de carga visual (skeleton screens o indicadores de progreso) mientras espera respuestas de la API, sin bloquear la interfaz de usuario.
5. IF la conexión a internet del dispositivo se interrumpe, THEN THE App SHALL mostrar un indicador de estado offline y reintentar automáticamente las operaciones pendientes cuando la conexión se restablezca.

---

### Requirement 15: Onboarding de Usuario

**User Story:** Como nuevo usuario, quiero un proceso de registro guiado y claro, para configurar mi perfil rápidamente y empezar a usar la app.

#### Acceptance Criteria

1. WHEN un usuario completa la verificación de correo institucional, THE App SHALL iniciar un flujo de onboarding paso a paso que guíe al usuario en la configuración de: foto principal, información básica, intereses y preferencias sociales.
2. THE App SHALL mostrar una barra de progreso durante el onboarding que indique al usuario en qué paso se encuentra y cuántos pasos faltan.
3. WHEN un usuario completa el onboarding, THE App SHALL redirigirlo a la pantalla principal de descubrimiento y mostrar un mensaje de bienvenida personalizado con su nombre.
4. THE App SHALL permitir al usuario omitir pasos opcionales del onboarding (intereses, preferencias sociales) y completarlos posteriormente desde la sección de edición de perfil.
5. IF un usuario abandona el onboarding antes de completarlo, THEN THE App SHALL preservar el progreso guardado y retomar desde el último paso completado en la siguiente sesión.

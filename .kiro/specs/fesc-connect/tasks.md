# Plan de Implementación: FESC Connect

## Visión General

Plan de implementación completo para FESC Connect, una red social universitaria mobile-first para estudiantes de la Universidad FESC. El plan cubre el stack completo: backend NestJS con Clean Architecture + DDD, y frontend React Native + Expo con TypeScript.

**Stack:** React Native + Expo + TypeScript (frontend) | NestJS + PostgreSQL + Prisma + Redis + Socket.io (backend)
**Lenguaje:** TypeScript en ambos proyectos
**Metodología:** Incremental, cada tarea construye sobre la anterior, sin código huérfano

---

## FASE 0 — Infraestructura y Setup

- [ ] 1. Inicializar repositorio monorepo y estructura base de ambos proyectos
  - [ ] 1.1 Crear estructura de monorepo con workspaces (apps/mobile, apps/api, packages/shared-types)
    - Inicializar `package.json` raíz con workspaces de npm/yarn
    - Crear `apps/mobile/` con `npx create-expo-app --template expo-template-blank-typescript`
    - Crear `apps/api/` con `nest new fesc-connect-api --package-manager npm`
    - Crear `packages/shared-types/` con tipos TypeScript compartidos (DTOs, enums)
    - Configurar `tsconfig.json` base y paths en cada proyecto
    - Agregar `.gitignore`, `.editorconfig`, `.nvmrc` (Node LTS)
    - _Requisitos: 13.4, 14.1_

  - [ ] 1.2 Configurar ESLint, Prettier y Husky en ambos proyectos
    - Instalar y configurar `eslint` + `@typescript-eslint/parser` en api y mobile
    - Instalar y configurar `prettier` con reglas consistentes entre proyectos
    - Configurar `husky` + `lint-staged` para pre-commit hooks
    - Agregar scripts `lint`, `format`, `type-check` en cada `package.json`
    - _Requisitos: 14.1_

- [ ] 2. Configurar backend NestJS con infraestructura base
  - [ ] 2.1 Configurar módulo de configuración, variables de entorno y estructura de carpetas
    - Instalar `@nestjs/config`, `joi` para validación de env vars
    - Crear `src/config/` con `app.config.ts`, `database.config.ts`, `jwt.config.ts`, `redis.config.ts`
    - Crear `.env.example` con todas las variables requeridas
    - Crear estructura de carpetas `src/modules/`, `src/common/`, `src/prisma/`
    - Configurar `AppModule` con `ConfigModule.forRoot({ validationSchema })`
    - _Requisitos: 13.4_

  - [ ] 2.2 Configurar Prisma ORM con PostgreSQL y ejecutar migración inicial
    - Instalar `prisma`, `@prisma/client`
    - Crear `prisma/schema.prisma` completo con todos los modelos del diseño (User, Profile, Photo, Interest, ProfileInterest, SocialPreference, DiscoveryFilter, Like, Match, Conversation, Message, ConversationArchive, Notification, Report, Block, ShadowBan, VerificationToken, RefreshToken)
    - Definir todos los enums: `UserStatus`, `SocialPreferenceType`, `InterestCategory`, `MessageType`, `ReportCategory`, `NotificationType`, `VerificationTokenType`
    - Crear `PrismaModule` y `PrismaService` como módulo global
    - Ejecutar `prisma migrate dev --name init` para crear migración inicial
    - Crear `prisma/seed.ts` con datos semilla de intereses por categoría
    - _Requisitos: 5.1, 6.1, 8.1, 9.1, 10.1, 11.1, 12.1_

  - [ ] 2.3 Configurar Redis con módulo de caché
    - Instalar `ioredis`, `@nestjs/cache-manager`, `cache-manager-ioredis-yet`
    - Crear `RedisModule` con `RedisService` que encapsula operaciones get/set/del/expire
    - Implementar patrones de clave definidos en el diseño (`discovery:queue:*`, `score:*`, `session:refresh:*`, `rate:*`, `online:*`)
    - _Requisitos: 2.2, 6.1, 10.3, 14.1_

  - [ ] 2.4 Configurar filtros globales, interceptores y pipes de validación
    - Crear `GlobalExceptionFilter` que mapea excepciones de dominio a respuestas HTTP estructuradas
    - Crear `TransformInterceptor` para envolver respuestas en `{ data, meta, timestamp }`
    - Crear `LoggingInterceptor` para registrar peticiones/respuestas
    - Configurar `ValidationPipe` global con `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
    - Crear `DomainError` base class con código y mensaje
    - Configurar `app.setGlobalPrefix('api/v1')`
    - _Requisitos: 13.1, 13.3_

  - [ ] 2.5 Configurar rate limiting global con Throttler
    - Instalar `@nestjs/throttler`
    - Configurar `ThrottlerModule` con límites: 100 req/min por IP, 200 req/min por usuario autenticado
    - Crear `ThrottleGuard` personalizado que lee IP y userId del request
    - Aplicar guard globalmente en `AppModule`
    - _Requisitos: 13.3_

- [ ] 3. Configurar frontend React Native + Expo con infraestructura base
  - [ ] 3.1 Instalar y configurar dependencias del frontend
    - Instalar: `expo-router`, `zustand`, `@tanstack/react-query`, `nativewind`, `react-hook-form`, `zod`, `react-native-reanimated`, `react-native-gesture-handler`, `expo-secure-store`, `expo-notifications`, `expo-image-picker`, `axios`
    - Configurar `babel.config.js` con plugins de Reanimated y NativeWind
    - Configurar `tailwind.config.js` con paleta de colores dark mode del diseño
    - Configurar `tsconfig.json` con paths alias (`@/` → `src/`)
    - Crear `app.json` con configuración de Expo (scheme, plugins)
    - _Requisitos: 14.4_

  - [ ] 3.2 Crear sistema de diseño base (tema, colores, tipografía)
    - Crear `src/theme/colors.ts` con paleta dark mode (backgrounds, surfaces, accents, text, borders)
    - Crear `src/theme/typography.ts` con escala tipográfica (Inter font)
    - Crear `src/theme/spacing.ts` con sistema de espaciado (4px base)
    - Crear `src/theme/index.ts` exportando todo el tema
    - Crear componentes UI atómicos: `Button.tsx`, `Input.tsx`, `Avatar.tsx`, `Badge.tsx`, `Card.tsx`, `Modal.tsx`, `BottomSheet.tsx`, `SkeletonLoader.tsx`, `ProgressBar.tsx`, `Toast.tsx`, `EmptyState.tsx`
    - Crear componentes de layout: `SafeAreaWrapper.tsx`, `KeyboardAvoidingWrapper.tsx`, `OfflineBanner.tsx`
    - _Requisitos: 14.4, 15.2_

  - [ ] 3.3 Configurar cliente API Axios con interceptor de refresh automático
    - Crear `src/services/api/client.ts` con instancia Axios configurada (baseURL, timeout, headers)
    - Crear `src/services/api/interceptors.ts` con lógica de refresh automático (cola de peticiones fallidas, flag `isRefreshing`)
    - Crear `src/services/api/endpoints.ts` con constantes de todos los endpoints
    - Crear `src/lib/secureStorage.ts` como wrapper de `expo-secure-store`
    - Crear `src/lib/errorUtils.ts` para parsear errores de API
    - _Requisitos: 2.5, 2.6, 13.4_

  - [ ] 3.4 Configurar Expo Router con layouts y navegación base
    - Crear `src/app/_layout.tsx` con providers: `GestureHandlerRootView`, `QueryClientProvider`, `AuthProvider`
    - Crear `src/app/(auth)/_layout.tsx` para rutas no autenticadas
    - Crear `src/app/(onboarding)/_layout.tsx` para flujo de onboarding
    - Crear `src/app/(tabs)/_layout.tsx` con tab bar (Discover, Matches, Chat, Profile, Notifications)
    - Crear `src/app/+not-found.tsx`
    - Crear `src/types/navigation.types.ts` con tipos de rutas
    - _Requisitos: 15.1, 15.2_

  - [ ] 3.5 Configurar TanStack Query y Zustand stores globales
    - Crear `src/lib/queryClient.ts` con configuración de `QueryClient` (staleTime, retry, gcTime)
    - Crear `src/store/authStore.ts` con Zustand + persist en SecureStore (accessToken, refreshToken, userId, isAuthenticated)
    - Crear `src/hooks/useNetworkStatus.ts` con detección de conectividad
    - Crear `src/hooks/useAppState.ts` para detectar foreground/background
    - _Requisitos: 2.5, 2.6, 14.5_

- [ ] 4. Checkpoint — Infraestructura base lista
  - Verificar que el backend compila sin errores (`npm run build`)
  - Verificar que la app mobile inicia en simulador (`npx expo start`)
  - Verificar conexión a PostgreSQL y Redis
  - Asegurarse de que todos los tests pasan, consultar al usuario si hay dudas.


---

## FASE 1 — Autenticación (Backend + Frontend)

- [ ] 5. Implementar módulo de autenticación en el backend
  - [ ] 5.1 Crear Value Objects de dominio: Email y Password
    - Crear `src/modules/auth/domain/value-objects/email.vo.ts` con validación de dominio `@fesc.edu.co` y normalización a minúsculas
    - Crear `src/modules/auth/domain/value-objects/password.vo.ts` con `PasswordValidator.isValid()` (mín. 8 chars, 1 mayúscula, 1 minúscula, 1 número)
    - Crear `src/modules/auth/domain/errors/auth.errors.ts` con errores de dominio tipados
    - _Requisitos: 1.1, 1.5_

  - [ ]* 5.2 Escribir property tests para Email y Password Value Objects
    - **Property 1: Rechazo de Correos No Institucionales** — cualquier email sin `@fesc.edu.co` debe lanzar `INVALID_EMAIL_DOMAIN`
    - **Property 2: Registro con Correo Institucional Válido** — cualquier email válido `@fesc.edu.co` debe ser aceptado y normalizado
    - **Property 3: Validación de Contraseña** — acepta si y solo si cumple los 4 criterios; rechaza cualquier violación
    - Usar `fast-check` con `numRuns: 200`
    - **Valida: Requisitos 1.1, 1.2, 1.5**

  - [ ] 5.3 Crear entidad de dominio UserEntity y repositorio interface
    - Crear `src/modules/auth/domain/entities/user.entity.ts` con factory `UserEntity.create()`, método `verify(token)`, getters de estado
    - Crear `src/modules/auth/domain/repositories/user.repository.interface.ts` con métodos: `findByEmail`, `findById`, `save`, `update`
    - Crear `src/modules/auth/domain/services/token.domain-service.ts` para lógica de tokens de verificación
    - _Requisitos: 1.2, 1.3, 1.4_

  - [ ] 5.4 Implementar repositorio Prisma y servicios de infraestructura
    - Crear `src/modules/auth/infrastructure/repositories/prisma-user.repository.ts` implementando la interface
    - Crear `src/modules/auth/infrastructure/repositories/prisma-verification-token.repository.ts`
    - Crear `src/modules/auth/infrastructure/repositories/prisma-refresh-token.repository.ts`
    - Crear `src/modules/auth/infrastructure/services/jwt.service.ts` con generación/verificación de access (15min) y refresh (30d) tokens
    - Crear `src/modules/auth/infrastructure/services/email.service.ts` con SendGrid para envío de correos de verificación y recuperación
    - Crear `src/modules/auth/infrastructure/services/argon2.service.ts` para hash/verify de contraseñas con Argon2id
    - _Requisitos: 1.2, 2.1, 2.2, 13.2_

  - [ ] 5.5 Implementar estrategias JWT y guards de autenticación
    - Instalar `@nestjs/passport`, `passport-jwt`, `@nestjs/jwt`
    - Crear `src/modules/auth/infrastructure/strategies/jwt.strategy.ts` para access tokens
    - Crear `src/modules/auth/infrastructure/strategies/jwt-refresh.strategy.ts` para refresh tokens
    - Crear `src/modules/auth/presentation/guards/jwt-auth.guard.ts`
    - Crear `src/modules/auth/presentation/guards/jwt-refresh.guard.ts`
    - Crear `src/common/decorators/current-user.decorator.ts`
    - Crear `src/common/decorators/public.decorator.ts`
    - _Requisitos: 2.1, 2.2, 13.1_

  - [ ] 5.6 Implementar casos de uso: registro, verificación de email y login
    - Crear `RegisterUserHandler`: validar email/password, hashear con Argon2id, crear UserEntity, guardar, enviar correo de verificación
    - Crear `VerifyEmailHandler`: buscar token, validar expiración (24h), activar cuenta
    - Crear `LoginUserHandler`: buscar usuario, verificar password, verificar estado ACTIVE, generar par de tokens, guardar RefreshToken con IP
    - Implementar bloqueo temporal tras 5 intentos fallidos usando Redis (`rate:login:{ip}`)
    - _Requisitos: 1.2, 1.3, 1.4, 1.6, 2.1, 2.7_

  - [ ] 5.7 Implementar casos de uso: refresh de tokens, logout y recuperación de contraseña
    - Crear `RefreshTokensHandler`: verificar token no revocado, generar nuevo par, revocar token anterior (rotación)
    - Crear `LogoutHandler`: revocar RefreshToken activo en DB y Redis
    - Crear `ForgotPasswordHandler`: buscar usuario, generar token (1h), enviar correo (respuesta genérica si no existe)
    - Crear `ResetPasswordHandler`: validar token, actualizar password con Argon2id, revocar todos los RefreshTokens del usuario
    - _Requisitos: 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

  - [ ] 5.8 Crear DTOs, controller y módulo de autenticación
    - Crear DTOs con validación class-validator: `RegisterDto`, `LoginDto`, `RefreshTokenDto`, `VerifyEmailDto`, `ForgotPasswordDto`, `ResetPasswordDto`
    - Crear `AuthController` con endpoints: `POST /auth/register`, `POST /auth/login`, `POST /auth/verify-email`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`
    - Crear `AuthModule` registrando todos los providers, repositorios y estrategias
    - Configurar Swagger decorators en el controller
    - _Requisitos: 1.1–1.6, 2.1–2.7, 3.1–3.4, 13.1_

  - [ ]* 5.9 Escribir tests de integración para el módulo de autenticación
    - Test: registro con correo no institucional retorna 400
    - Test: registro exitoso crea usuario en estado PENDING_VERIFICATION
    - Test: verificación de email activa la cuenta
    - Test: login con credenciales válidas retorna par de tokens
    - Test: refresh de tokens rota el refresh token
    - Test: endpoints protegidos retornan 401 sin token (**Property 13**)
    - Usar `@nestjs/testing` + Supertest + base de datos de test
    - **Valida: Requisitos 1.1–1.6, 2.1–2.7, 13.1**

- [ ] 6. Implementar pantallas de autenticación en el frontend
  - [ ] 6.1 Crear tipos, servicios API y store de autenticación
    - Crear `src/features/auth/types/auth.types.ts` con interfaces: `LoginRequest`, `RegisterRequest`, `AuthTokens`, `AuthUser`
    - Crear `src/features/auth/services/authApi.ts` con funciones: `login`, `register`, `refreshTokens`, `logout`, `verifyEmail`, `forgotPassword`, `resetPassword`
    - Crear `src/features/auth/utils/passwordValidator.ts` con validación client-side
    - Crear `src/features/auth/utils/tokenUtils.ts` para decodificar JWT y verificar expiración
    - _Requisitos: 2.5, 2.6_

  - [ ] 6.2 Crear hooks de autenticación con React Hook Form + Zod
    - Crear `src/features/auth/hooks/useLogin.ts` con mutación TanStack Query, manejo de errores y navegación post-login
    - Crear `src/features/auth/hooks/useRegister.ts` con validación Zod del formulario
    - Crear `src/features/auth/hooks/useLogout.ts` que limpia store y SecureStore
    - Crear `src/features/auth/hooks/useForgotPassword.ts`
    - Crear `src/features/auth/components/AuthProvider.tsx` que verifica tokens al iniciar y redirige según estado
    - _Requisitos: 2.5, 2.6_

  - [ ] 6.3 Implementar pantallas de login y registro
    - Crear `src/app/(auth)/login.tsx` con formulario (email, password), validación Zod, manejo de errores de API, link a registro y recuperación
    - Crear `src/app/(auth)/register.tsx` con formulario (email, password, confirmación), validación de dominio `@fesc.edu.co` en tiempo real
    - Crear `src/app/(auth)/verify-email.tsx` con instrucciones y botón de reenvío
    - Crear `src/features/auth/components/LoginForm.tsx`, `RegisterForm.tsx`, `PasswordInput.tsx` (con toggle de visibilidad)
    - _Requisitos: 1.1, 1.2, 1.5_

  - [ ] 6.4 Implementar pantalla de recuperación de contraseña
    - Crear `src/app/(auth)/forgot-password.tsx` con formulario de email y confirmación de envío
    - Implementar deep link handler para el enlace de restablecimiento (`fescconnect://reset-password?token=...`)
    - Crear pantalla de nueva contraseña con validación Zod
    - _Requisitos: 3.1, 3.2, 3.3, 3.4_

- [ ] 7. Checkpoint — Autenticación completa
  - Verificar flujo completo: registro → verificación email → login → refresh → logout
  - Verificar recuperación de contraseña end-to-end
  - Asegurarse de que todos los tests pasan, consultar al usuario si hay dudas.


---

## FASE 2 — Perfil (Backend + Frontend)

- [ ] 8. Implementar módulo de perfil en el backend
  - [ ] 8.1 Crear entidades de dominio y Value Objects de perfil
    - Crear `src/modules/profile/domain/entities/profile.entity.ts` con lógica de negocio: `addPhoto()` (máx. 6), `addInterest()` (máx. 15), `calculateCompletionPercentage()`
    - Crear `src/modules/profile/domain/value-objects/interests.vo.ts` con validación de máximo 15 intereses
    - Crear `src/modules/profile/domain/value-objects/social-preferences.vo.ts` con enum `SocialPreferenceType`
    - Crear `src/modules/profile/domain/repositories/profile.repository.interface.ts`
    - _Requisitos: 4.1, 4.2, 4.4, 4.5, 4.6_

  - [ ]* 8.2 Escribir property tests para invariantes de validación de perfil
    - **Property 5: Invariantes de Validación de Perfil** — rechaza >6 fotos, fotos >10MB o formato inválido, >15 intereses; perfil no cambia ante violación
    - Usar `fast-check` con arbitrarios para arrays de fotos e intereses
    - **Valida: Requisitos 4.2, 4.4**

  - [ ] 8.3 Implementar servicio de procesamiento de imágenes y almacenamiento S3
    - Instalar `sharp`, `@aws-sdk/client-s3`, `multer`, `@nestjs/platform-express`
    - Crear `src/modules/profile/infrastructure/services/image-processing.service.ts` que comprime imágenes sin pérdida visual perceptible y valida formato/tamaño
    - Crear `src/modules/profile/infrastructure/services/storage.service.ts` para subir/eliminar archivos en S3
    - Crear `StorageModule` como módulo global
    - _Requisitos: 4.2, 4.7_

  - [ ] 8.4 Implementar repositorio Prisma y casos de uso de perfil
    - Crear `src/modules/profile/infrastructure/repositories/prisma-profile.repository.ts`
    - Crear `CreateProfileHandler`: crear perfil con campos obligatorios, calcular completion percentage
    - Crear `UpdateProfileHandler`: validar campos, persistir cambios, recalcular completion percentage
    - Crear `GetProfileHandler`: obtener perfil propio o ajeno con fotos, intereses y preferencias
    - Crear `UploadPhotoHandler`: procesar imagen, subir a S3, agregar a galería (máx. 6)
    - Crear `DeleteAccountHandler`: soft delete de usuario y todos sus datos asociados
    - _Requisitos: 4.1–4.7, 5.1, 5.4, 13.5_

  - [ ] 8.5 Crear DTOs, controller y módulo de perfil
    - Crear DTOs: `CreateProfileDto`, `UpdateProfileDto`, `ProfileResponseDto`, `UploadPhotoDto`
    - Crear `ProfileController` con endpoints: `POST /profiles`, `GET /profiles/me`, `GET /profiles/:userId`, `PATCH /profiles/me`, `POST /profiles/me/photos`, `DELETE /profiles/me/photos/:photoId`, `DELETE /profiles/me` (eliminar cuenta)
    - Aplicar `JwtAuthGuard` en todos los endpoints
    - Crear `ProfileModule` con todos los providers
    - _Requisitos: 4.1–4.7, 5.1–5.4, 13.1_

  - [ ]* 8.6 Escribir tests unitarios para casos de uso de perfil
    - Test: crear perfil con campos obligatorios faltantes retorna errores por campo
    - Test: agregar más de 6 fotos retorna error
    - Test: agregar más de 15 intereses retorna error
    - Test: calcular completion percentage correctamente
    - **Valida: Requisitos 4.1, 4.2, 4.4, 4.6, 5.4**

- [ ] 9. Implementar pantallas de perfil en el frontend
  - [ ] 9.1 Crear tipos, servicios API y store de perfil
    - Crear `src/features/profile/types/profile.types.ts` con interfaces: `Profile`, `Photo`, `Interest`, `SocialPreference`, `UpdateProfileRequest`
    - Crear `src/features/profile/services/profileApi.ts` con funciones para todos los endpoints de perfil
    - Crear `src/features/profile/store/profileStore.ts` con Zustand para perfil propio
    - _Requisitos: 4.1–4.7, 5.1_

  - [ ] 9.2 Crear hooks y componentes de perfil
    - Crear `src/features/profile/hooks/useProfile.ts` con TanStack Query para obtener perfil
    - Crear `src/features/profile/hooks/useEditProfile.ts` con mutación y validación Zod
    - Crear `src/features/profile/hooks/useUploadPhoto.ts` con `expo-image-picker` y compresión
    - Crear `src/features/profile/components/ProfileCard.tsx` (vista completa de perfil)
    - Crear `src/features/profile/components/PhotoGallery.tsx` (galería con drag-to-reorder)
    - Crear `src/features/profile/components/InterestBadge.tsx`
    - Crear `src/features/profile/components/SocialPreferenceBadge.tsx`
    - Crear `src/features/profile/components/CompletionBar.tsx`
    - Crear `src/features/profile/components/CompatibilityScore.tsx` (muestra score 0-100)
    - _Requisitos: 4.1–4.7, 5.1, 5.2, 5.4_

  - [ ] 9.3 Implementar pantalla de perfil propio y edición
    - Crear `src/app/(tabs)/profile/index.tsx` mostrando foto principal, galería, nombre, edad, carrera, semestre, bio, intereses, preferencias y barra de completitud
    - Crear `src/app/(tabs)/profile/edit.tsx` con formulario React Hook Form + Zod para editar todos los campos
    - Implementar selector de intereses (grid con máx. 15 seleccionables)
    - Implementar selector de preferencias sociales (multi-select)
    - _Requisitos: 4.1–4.7, 5.1, 5.4_

  - [ ] 9.4 Implementar pantalla de perfil ajeno con Score de Compatibilidad
    - Crear `src/app/profile/[userId].tsx` como modal con perfil completo del usuario
    - Mostrar `CompatibilityScore` calculado entre el usuario actual y el perfil visitado
    - Implementar botones de acción: Like, Guardar, Bloquear, Reportar
    - Respetar bloqueos mutuos (no mostrar perfil si hay bloqueo)
    - _Requisitos: 5.2, 5.3_

- [ ] 10. Implementar flujo de onboarding en el frontend
  - [ ] 10.1 Crear pantallas de onboarding paso a paso
    - Crear `src/app/(onboarding)/step-photo.tsx` — Paso 1: subir foto principal obligatoria con `expo-image-picker`
    - Crear `src/app/(onboarding)/step-info.tsx` — Paso 2: nombre, edad, carrera, semestre (campos obligatorios)
    - Crear `src/app/(onboarding)/step-interests.tsx` — Paso 3: selección de intereses (opcional, máx. 15)
    - Crear `src/app/(onboarding)/step-preferences.tsx` — Paso 4: preferencias sociales (opcional)
    - Crear `src/app/(onboarding)/_layout.tsx` con `ProgressBar` mostrando paso actual / total
    - _Requisitos: 15.1, 15.2, 15.4_

  - [ ] 10.2 Implementar persistencia de progreso de onboarding
    - Crear `src/features/auth/utils/onboarding-progress.manager.ts` que guarda/restaura progreso en SecureStore
    - Implementar lógica en `AuthProvider` para detectar onboarding incompleto y redirigir al paso correcto
    - Al completar onboarding, redirigir a `(tabs)/discover` con mensaje de bienvenida personalizado
    - _Requisitos: 15.3, 15.5_

  - [ ]* 10.3 Escribir property tests para persistencia de onboarding
    - **Property 14: Persistencia del Progreso de Onboarding** — al abandonar en cualquier paso (1-4), al retomar se presenta el paso siguiente con datos preservados
    - Usar `fast-check` con arbitrarios para paso (1-4) y datos parciales
    - **Valida: Requisito 15.5**

- [ ] 11. Checkpoint — Perfil y Onboarding completos
  - Verificar flujo completo: onboarding → perfil propio → edición → subida de fotos
  - Verificar que el score de compatibilidad se muestra en perfiles ajenos
  - Asegurarse de que todos los tests pasan, consultar al usuario si hay dudas.


---

## FASE 3 — Discovery y Matches (Backend + Frontend)

- [ ] 12. Implementar motor de recomendaciones y Score de Compatibilidad
  - [ ] 12.1 Implementar algoritmo de Score de Compatibilidad
    - Crear `src/modules/recommendation/domain/services/compatibility.domain-service.ts` con método `calculateScore({ userA, userB })`
    - Implementar fórmula: intereses en común (40%), compatibilidad de preferencias sociales (25%), afinidad carrera/semestre (20%), actividad reciente (15%)
    - Garantizar resultado entero en [0, 100] y simetría (score(A,B) === score(B,A))
    - Crear `src/modules/recommendation/infrastructure/repositories/prisma-recommendation.repository.ts`
    - _Requisitos: 6.8, 10.1, 10.4, 10.5_

  - [ ]* 12.2 Escribir property tests para el Score de Compatibilidad
    - **Property 7: Rango del Score** — para cualquier par de perfiles, el score es entero en [0, 100]
    - **Property 8: Simetría del Score** — score(A,B) === score(B,A) en el mismo instante
    - **Property 9: Monotonicidad por Intereses** — más intereses en común produce score ≥ score original
    - Usar `fast-check` con arbitrarios de perfiles aleatorios, `numRuns: 200`
    - **Valida: Requisitos 6.8, 10.1, 10.4, 10.5**

  - [ ] 12.3 Implementar caché de scores y recálculo periódico
    - Implementar caché de scores en Redis con clave `score:{userA}:{userB}` (TTL: 6h)
    - Crear `RecommendationModule` con `RecommendationService` que expone `getScore(userAId, userBId)`
    - Implementar job de recálculo periódico (cada 24h) usando `@nestjs/schedule`
    - Actualizar modelo de preferencias cuando el usuario interactúa (Like/Pass/chat)
    - _Requisitos: 10.2, 10.3_

- [ ] 13. Implementar módulo de Discovery en el backend
  - [ ] 13.1 Implementar generación de cola de descubrimiento con exclusiones
    - Crear `src/modules/discovery/domain/services/discovery.domain-service.ts`
    - Implementar lógica de exclusiones: propio usuario, bloqueados (ambas direcciones), vistos en últimas 24h (Redis `discovery:seen:*`)
    - Implementar aplicación de filtros: rango de edad, carrera, semestre, preferencias sociales
    - Ordenar cola por Score_de_Compatibilidad descendente
    - Cachear cola en Redis `discovery:queue:{userId}` (TTL: 1h)
    - _Requisitos: 6.1, 6.2, 7.1, 7.2_

  - [ ]* 13.2 Escribir property tests para exclusiones de la cola de descubrimiento
    - **Property 6: Exclusiones de la Cola** — la cola no contiene el propio usuario, bloqueados ni vistos en 24h
    - Usar `fast-check` con conjuntos arbitrarios de usuarios y bloqueos
    - **Valida: Requisitos 5.3, 6.2**

  - [ ] 13.3 Implementar acciones de swipe: Like, Pass, Guardar, Bloquear, Reportar
    - Crear `LikeProfileHandler`: registrar Like en DB, verificar like recíproco, crear Match si aplica, enviar notificación push
    - Crear `PassProfileHandler`: registrar rechazo en Redis (TTL: 7 días), no mostrar perfil por 7 días
    - Crear `SaveProfileHandler`: agregar perfil a lista de guardados del usuario
    - Registrar perfil como visto en Redis `discovery:seen:{userId}:{targetId}` (TTL: 24h)
    - _Requisitos: 6.3, 6.4, 6.5_

  - [ ] 13.4 Implementar gestión de filtros de descubrimiento
    - Crear `UpdateFiltersHandler`: guardar filtros en DB, invalidar caché de cola en Redis
    - Crear `GetFiltersHandler`: obtener filtros actuales del usuario
    - Crear `ResetFiltersHandler`: restaurar valores por defecto
    - Persistir filtros entre sesiones (guardados en DB)
    - _Requisitos: 7.1, 7.2, 7.3, 7.4_

  - [ ] 13.5 Crear DTOs, controller y módulo de Discovery
    - Crear DTOs: `DiscoveryQueueResponseDto`, `SwipeActionDto`, `DiscoveryFiltersDto`
    - Crear `DiscoveryController` con endpoints: `GET /discovery/queue`, `POST /discovery/like/:targetId`, `POST /discovery/pass/:targetId`, `POST /discovery/save/:targetId`, `GET /discovery/filters`, `PUT /discovery/filters`, `DELETE /discovery/filters`
    - Crear `DiscoveryModule` con todos los providers
    - Garantizar respuesta de cola en <2s (Req. 14.3)
    - _Requisitos: 6.1–6.9, 7.1–7.4, 14.3_

- [ ] 14. Implementar módulo de Matches en el backend
  - [ ] 14.1 Implementar gestión de Likes recibidos y Matches
    - Crear `src/modules/match/domain/entities/match.entity.ts` con `isHighlighted: true` para Conexión_Destacada
    - Crear `GetLikesReceivedHandler`: obtener likes no ignorados paginados (bloques de 20)
    - Crear `GetMatchesHandler`: obtener matches ordenados por fecha descendente con indicador de actividad reciente
    - Crear `DiscardLikeHandler`: marcar like como ignorado, no volver a mostrar en sección de interesados
    - _Requisitos: 8.1, 8.3, 8.4, 8.6_

  - [ ] 14.2 Crear DTOs, controller y módulo de Matches
    - Crear DTOs: `MatchResponseDto`, `LikeResponseDto` con Score_de_Compatibilidad incluido
    - Crear `MatchController` con endpoints: `GET /matches`, `GET /matches/likes-received`, `POST /matches/likes/:likeId/discard`
    - Crear `MatchModule` con todos los providers
    - _Requisitos: 8.1–8.6, 13.1_

- [ ] 15. Implementar pantallas de Discovery y Matches en el frontend
  - [ ] 15.1 Crear tipos, servicios API y stores de Discovery y Matches
    - Crear `src/features/discovery/types/discovery.types.ts` y `src/features/matches/types/match.types.ts`
    - Crear `src/features/discovery/services/discoveryApi.ts` y `src/features/matches/services/matchApi.ts`
    - Crear `src/features/discovery/store/discoveryStore.ts` con cola local de perfiles
    - Crear `src/features/matches/store/matchStore.ts`
    - _Requisitos: 6.1, 8.1_

  - [ ] 15.2 Implementar componente SwipeCard con gestos y animaciones
    - Crear `src/features/discovery/components/SwipeCard.tsx` con `react-native-gesture-handler` + `react-native-reanimated`
    - Implementar gestos: swipe derecha (Like), swipe izquierda (Pass), swipe arriba (Guardar)
    - Crear `src/features/discovery/components/SwipeCardStack.tsx` con pre-carga de las siguientes 3 tarjetas
    - Crear `src/features/discovery/components/ActionButtons.tsx` (Like, Pass, Guardar, Bloquear, Reportar)
    - Crear `src/features/discovery/hooks/useSwipeGesture.ts` con lógica de animación
    - _Requisitos: 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ] 15.3 Implementar pantalla de Discovery con filtros
    - Crear `src/app/(tabs)/discover/index.tsx` con `SwipeCardStack` y manejo de cola vacía
    - Crear `src/app/(tabs)/discover/filters.tsx` como bottom sheet con filtros (edad, carrera, semestre, preferencias)
    - Crear `src/features/discovery/hooks/useDiscovery.ts` con infinite query para la cola
    - Crear `src/features/discovery/hooks/useFilters.ts` para gestión de filtros
    - Mostrar mensaje cuando la cola se agota (Req. 6.9)
    - _Requisitos: 6.1–6.9, 7.1–7.4_

  - [ ] 15.4 Implementar pantallas de Matches y Likes recibidos
    - Crear `src/app/(tabs)/matches/index.tsx` con dos secciones: "Conexiones Destacadas" y "Personas interesadas en ti"
    - Crear `src/features/matches/components/MatchCard.tsx` con indicador de actividad reciente en conversación
    - Crear `src/features/matches/components/LikeCard.tsx` con acciones: devolver Like, iniciar chat, descartar
    - Crear `src/features/matches/components/MatchAnimation.tsx` (animación Lottie al hacer match)
    - Crear `src/features/matches/hooks/useMatches.ts` y `useLikesReceived.ts`
    - _Requisitos: 8.1–8.6_

- [ ] 16. Checkpoint — Discovery y Matches completos
  - Verificar flujo completo: cola de perfiles → swipe → match → animación → sección de matches
  - Verificar que los filtros persisten entre sesiones
  - Asegurarse de que todos los tests pasan, consultar al usuario si hay dudas.


---

## FASE 4 — Chat en Tiempo Real (Backend + Frontend)

- [ ] 17. Implementar módulo de Chat en el backend
  - [ ] 17.1 Crear entidades de dominio y repositorios de Chat
    - Crear `src/modules/chat/domain/entities/conversation.entity.ts` y `message.entity.ts`
    - Crear `src/modules/chat/domain/repositories/conversation.repository.interface.ts` y `message.repository.interface.ts`
    - Crear `src/modules/chat/infrastructure/repositories/prisma-conversation.repository.ts`
    - Crear `src/modules/chat/infrastructure/repositories/prisma-message.repository.ts`
    - Implementar paginación de mensajes en bloques de 50 ordenados cronológicamente
    - _Requisitos: 9.1, 9.9_

  - [ ]* 17.2 Escribir property tests para paginación de mensajes
    - **Property 10: Paginación Correcta de Mensajes** — para N mensajes y tamaño de página P (1≤P≤50), retorna todos sin duplicados ni omisiones en orden cronológico
    - Usar `fast-check` con arrays arbitrarios de mensajes y tamaños de página
    - **Valida: Requisito 9.9**

  - [ ] 17.3 Implementar casos de uso de mensajería REST
    - Crear `GetConversationsHandler`: listar conversaciones del usuario ordenadas por `lastMessageAt` descendente, con soporte de búsqueda por nombre
    - Crear `GetMessagesHandler`: obtener mensajes paginados de una conversación (cursor-based)
    - Crear `ArchiveConversationHandler`: mover conversación a archivados sin eliminar historial
    - Crear `DeleteConversationHandler`: soft delete solo para el usuario que elimina
    - Crear `SendImageMessageHandler`: validar formato/tamaño (JPG/PNG/WEBP, máx. 5MB), subir a S3, crear mensaje tipo IMAGE
    - _Requisitos: 9.1, 9.5, 9.7, 9.8, 9.9, 9.12_

  - [ ] 17.4 Implementar WebSocket Gateway para mensajería en tiempo real
    - Instalar `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`
    - Crear `src/modules/chat/presentation/gateways/chat.gateway.ts` con `@WebSocketGateway`
    - Implementar autenticación WebSocket con JWT en el handshake
    - Implementar eventos: `message:send` → entrega en tiempo real (<300ms), `message:read` → marcar como leído y notificar al remitente, `typing:start`/`typing:stop` → indicador de escritura (desaparece tras 3s de inactividad)
    - Implementar presencia online: `online:{userId}` en Redis (TTL: 30s, renovado por heartbeat cada 20s)
    - Implementar rooms de Socket.io por conversación (`conversation:{conversationId}`)
    - _Requisitos: 9.2, 9.3, 9.4, 9.10_

  - [ ] 17.5 Crear DTOs, controller REST y módulo de Chat
    - Crear DTOs: `SendMessageDto`, `MessageResponseDto`, `ConversationResponseDto`, `PaginatedMessagesDto`
    - Crear `ChatController` con endpoints: `GET /conversations`, `GET /conversations/:id/messages`, `POST /conversations/:id/messages/image`, `PATCH /conversations/:id/archive`, `DELETE /conversations/:id`
    - Crear `ChatModule` con todos los providers y gateway
    - _Requisitos: 9.1–9.12, 13.1_

  - [ ]* 17.6 Escribir tests de integración para el módulo de Chat
    - Test: cualquier usuario puede iniciar conversación sin match previo
    - Test: mensajes se entregan en tiempo real vía WebSocket
    - Test: read receipts se envían cuando el destinatario tiene la conversación abierta
    - Test: archivar conversación no elimina historial
    - Test: eliminar conversación solo afecta al usuario que elimina
    - **Valida: Requisitos 9.1, 9.2, 9.3, 9.7, 9.8**

- [ ] 18. Implementar pantallas de Chat en el frontend
  - [ ] 18.1 Crear tipos, servicios API, socket client y store de Chat
    - Crear `src/features/chat/types/chat.types.ts` con interfaces: `Conversation`, `Message`, `TypingEvent`, `OnlineStatus`
    - Crear `src/features/chat/services/chatApi.ts` para endpoints REST
    - Crear `src/services/socket/socketClient.ts` como singleton de Socket.io con reconexión automática
    - Crear `src/services/socket/socketEvents.ts` con constantes de eventos
    - Crear `src/features/chat/services/chatSocket.ts` con funciones de alto nivel para eventos de chat
    - Crear `src/features/chat/store/chatStore.ts` con Zustand para conversaciones y mensajes en memoria
    - _Requisitos: 9.2, 9.3, 9.4, 9.10_

  - [ ] 18.2 Crear hooks de Chat con WebSocket
    - Crear `src/features/chat/hooks/useConversations.ts` con TanStack Query + invalidación por eventos WS
    - Crear `src/features/chat/hooks/useMessages.ts` con infinite query (cursor-based) + append de mensajes en tiempo real
    - Crear `src/features/chat/hooks/useChatSocket.ts` que gestiona conexión WS, eventos y reconexión
    - Crear `src/features/chat/hooks/useTypingIndicator.ts` con debounce de 3s
    - _Requisitos: 9.2, 9.3, 9.4, 9.10_

  - [ ] 18.3 Crear componentes de Chat
    - Crear `src/features/chat/components/ConversationItem.tsx` con avatar, nombre, último mensaje, timestamp y badge de no leídos
    - Crear `src/features/chat/components/MessageBubble.tsx` con soporte de texto, imagen y emoji; diferenciando mensajes propios/ajenos
    - Crear `src/features/chat/components/ChatInput.tsx` con campo de texto, botón de envío y botón de imagen
    - Crear `src/features/chat/components/TypingIndicator.tsx` con animación de puntos
    - Crear `src/features/chat/components/ReadReceipt.tsx` (✓ enviado, ✓✓ leído)
    - Crear `src/features/chat/components/OnlineIndicator.tsx` (punto verde/gris)
    - Crear `src/features/chat/components/ImageMessage.tsx` con preview y lightbox
    - _Requisitos: 9.2, 9.3, 9.4, 9.5, 9.6, 9.10_

  - [ ] 18.4 Implementar pantalla de bandeja de conversaciones
    - Crear `src/app/(tabs)/chat/index.tsx` con lista de conversaciones ordenadas por actividad reciente
    - Implementar búsqueda de conversaciones por nombre de usuario (Req. 9.12)
    - Implementar swipe-to-archive en items de conversación
    - Mostrar estado online/offline en cada item
    - _Requisitos: 9.7, 9.10, 9.12_

  - [ ] 18.5 Implementar pantalla de conversación individual
    - Crear `src/app/(tabs)/chat/[conversationId].tsx` con lista de mensajes invertida (más recientes abajo)
    - Implementar scroll infinito hacia arriba para cargar mensajes anteriores
    - Mostrar typing indicator cuando el otro usuario escribe
    - Mostrar estado online/offline en la cabecera
    - Implementar envío de imágenes con `expo-image-picker`
    - Implementar soporte de emojis Unicode en el input
    - _Requisitos: 9.2, 9.3, 9.4, 9.5, 9.6, 9.9, 9.10_

- [ ] 19. Checkpoint — Chat en tiempo real completo
  - Verificar mensajería en tiempo real entre dos usuarios sin match previo
  - Verificar typing indicator, read receipts y estado online
  - Verificar envío de imágenes y emojis
  - Asegurarse de que todos los tests pasan, consultar al usuario si hay dudas.


---

## FASE 5 — Notificaciones Push

- [ ] 20. Implementar módulo de Notificaciones en el backend
  - [ ] 20.1 Implementar servicio de Expo Push Notifications
    - Instalar `expo-server-sdk`
    - Crear `src/modules/notification/infrastructure/services/expo-push.service.ts` con método `sendPushNotification(userId, payload)`
    - Implementar cola de notificaciones con retención de 72h para dispositivos offline (usando Redis sorted set con TTL)
    - Crear `src/modules/notification/infrastructure/repositories/prisma-notification.repository.ts`
    - _Requisitos: 11.1, 11.5_

  - [ ] 20.2 Implementar casos de uso y eventos de notificación
    - Crear `SendNotificationHandler` que verifica preferencias del usuario antes de enviar
    - Integrar notificaciones en eventos existentes: nuevo Like (`MatchModule`), nuevo Match (`MatchModule`), nuevo mensaje (`ChatModule`), visita de perfil (`ProfileModule`)
    - Crear `GetNotificationsHandler`: listar notificaciones del usuario paginadas
    - Crear `UpdateNotificationPreferencesHandler`: guardar preferencias por tipo de notificación
    - _Requisitos: 11.1, 11.4_

  - [ ] 20.3 Crear DTOs, controller y módulo de Notificaciones
    - Crear DTOs: `NotificationResponseDto`, `UpdateNotificationPreferencesDto`
    - Crear `NotificationController` con endpoints: `GET /notifications`, `PATCH /notifications/preferences`, `POST /notifications/register-token` (registrar Expo Push Token)
    - Crear `NotificationModule` con todos los providers
    - _Requisitos: 11.1–11.5, 13.1_

- [ ] 21. Implementar notificaciones push en el frontend
  - [ ] 21.1 Configurar Expo Notifications y registro de token
    - Crear `src/features/notifications/services/pushService.ts` con `registerForPushNotificationsAsync()` usando `expo-notifications`
    - Solicitar permisos durante el onboarding (una sola vez por sesión)
    - Registrar Expo Push Token en el backend al iniciar sesión
    - Implementar handler de notificaciones en foreground y background
    - _Requisitos: 11.3_

  - [ ] 21.2 Implementar navegación desde notificaciones y pantalla de notificaciones
    - Crear handler de `notification.response` que navega a la pantalla correspondiente según el tipo de evento (like → matches, match → matches, mensaje → chat/:id, visita → profile/:id)
    - Crear `src/app/(tabs)/notifications/index.tsx` con lista de notificaciones
    - Crear `src/features/notifications/components/NotificationItem.tsx` con icono por tipo, título, cuerpo y timestamp
    - Crear `src/features/notifications/components/NotificationBadge.tsx` para el tab bar
    - Crear `src/features/notifications/hooks/useNotifications.ts` y `usePushPermission.ts`
    - _Requisitos: 11.1, 11.2, 11.3, 11.4_


---

## FASE 6 — Moderación y Seguridad

- [ ] 22. Implementar módulo de Moderación en el backend
  - [ ] 22.1 Implementar sistema de reportes y bloqueos
    - Crear `src/modules/moderation/domain/entities/report.entity.ts` y `block.entity.ts`
    - Crear `ReportUserHandler`: registrar reporte con ID reportante, ID reportado, categoría, timestamp y descripción opcional; confirmar recepción
    - Crear `BlockUserHandler`: registrar bloqueo, ocultar perfiles mutuamente (invalidar colas de discovery en Redis), eliminar likes pendientes entre ambos, archivar conversaciones activas
    - Crear `GetBlockedUsersHandler`: listar usuarios bloqueados por el usuario actual
    - _Requisitos: 12.1, 12.2, 12.6_

  - [ ] 22.2 Implementar shadow moderation y registro de auditoría
    - Crear `ShadowBanService`: verificar si un usuario tiene ≥5 reportes en 7 días y aplicar shadow ban automáticamente
    - Integrar shadow ban en `DiscoveryModule`: reducir visibilidad de perfiles con shadow ban sin notificar al afectado
    - Crear tabla de auditoría (usar modelo `ShadowBan` existente en Prisma) con timestamp y actor
    - Implementar job periódico (cada hora) para evaluar umbrales de shadow ban
    - _Requisitos: 12.3, 12.7_

  - [ ]* 22.3 Escribir property tests para shadow ban y rate limiting
    - **Property 11: Umbral de Shadow Ban** — shadow ban se aplica si y solo si el usuario tiene ≥5 reportes en 7 días; con <5 reportes mantiene visibilidad normal
    - **Property 12: Rate Limiting de Mensajes sin Match** — permite hasta 50 mensajes/hora sin match; rechaza con `MESSAGE_RATE_LIMIT_EXCEEDED` el mensaje 51; al inicio de nueva hora el contador se reinicia a 0
    - Usar `fast-check` con contadores arbitrarios de reportes y mensajes
    - **Valida: Requisitos 12.3, 12.4**

  - [ ] 22.4 Implementar anti-spam y rate limiting de mensajes
    - Crear `MessageRateLimitService`: usar Redis `rate:msg:{userId}` (TTL: 1h) para contar mensajes sin match; rechazar con error `MESSAGE_RATE_LIMIT_EXCEEDED` al superar 50/h
    - Implementar detección de spam: bloquear automáticamente mensajes con URLs repetidas o texto idéntico enviado a ≥3 usuarios distintos en <5 minutos
    - Integrar validaciones en `ChatGateway` antes de procesar cada mensaje
    - _Requisitos: 12.4, 12.5_

  - [ ] 22.5 Crear DTOs, controller y módulo de Moderación
    - Crear DTOs: `ReportUserDto` (con categorías: INAPPROPRIATE_CONTENT, HARASSMENT, SPAM, FAKE_PROFILE, OTHER), `BlockUserDto`
    - Crear `ModerationController` con endpoints: `POST /moderation/report/:userId`, `POST /moderation/block/:userId`, `DELETE /moderation/block/:userId`, `GET /moderation/blocked`
    - Crear `ModerationModule` con todos los providers
    - _Requisitos: 12.1–12.7, 13.1_

- [ ] 23. Implementar moderación en el frontend
  - [ ] 23.1 Crear componentes y hooks de moderación
    - Crear `src/features/moderation/components/ReportModal.tsx` con selector de categoría y campo de descripción opcional
    - Crear `src/features/moderation/components/BlockConfirmation.tsx` con confirmación de bloqueo
    - Crear `src/features/moderation/hooks/useReport.ts` con mutación TanStack Query
    - Crear `src/features/moderation/hooks/useBlock.ts` que invalida caches de discovery, matches y chat
    - Integrar botones de Reportar y Bloquear en: `SwipeCard`, perfil ajeno y pantalla de chat
    - _Requisitos: 12.1, 12.2, 12.6_

- [ ] 24. Reforzar seguridad transversal
  - [ ] 24.1 Implementar detección de IP sospechosa y reautenticación
    - En `JwtStrategy`, comparar IP del token con IP de la petición actual
    - Si difieren, registrar evento sospechoso en logs y retornar 401 requiriendo reautenticación
    - _Requisitos: 13.6_

  - [ ] 24.2 Verificar y documentar configuración HTTPS/TLS
    - Configurar `helmet` en NestJS para headers de seguridad HTTP
    - Documentar en `README.md` del backend la configuración de TLS 1.2+ en el servidor/load balancer
    - Verificar que todas las comunicaciones App ↔ API usan HTTPS (configuración en `client.ts`)
    - _Requisitos: 13.4_

- [ ] 25. Checkpoint — Moderación y Seguridad completos
  - Verificar flujo de reporte y bloqueo end-to-end
  - Verificar que el shadow ban reduce visibilidad sin notificar al usuario
  - Verificar rate limiting de mensajes (50/h sin match)
  - Asegurarse de que todos los tests pasan, consultar al usuario si hay dudas.


---

## FASE 7 — UX/UI Polish y Performance

- [ ] 26. Implementar estados de carga, offline y feedback visual
  - [ ] 26.1 Implementar skeleton screens y estados de carga en el frontend
    - Agregar `SkeletonLoader` en: cola de discovery (mientras carga), lista de conversaciones, lista de matches, perfil ajeno
    - Implementar `ProgressBar` animada en onboarding
    - Agregar indicadores de carga en todos los formularios (botones con spinner durante mutaciones)
    - _Requisitos: 14.4_

  - [ ] 26.2 Implementar manejo de estado offline y reintentos automáticos
    - Crear `src/components/layout/OfflineBanner.tsx` que se muestra cuando `useNetworkStatus` detecta desconexión
    - Configurar TanStack Query con `retry: 3` y `retryDelay: exponentialDelay` para reintentos automáticos
    - Implementar cola de operaciones pendientes en `chatStore` para mensajes enviados offline
    - _Requisitos: 14.5_

- [ ] 27. Optimizaciones de rendimiento
  - [ ] 27.1 Optimizar consultas de base de datos y caché
    - Revisar y agregar índices faltantes en Prisma schema (verificar EXPLAIN ANALYZE en consultas críticas)
    - Implementar connection pooling con PgBouncer o `@prisma/connection-pool`
    - Optimizar consulta de cola de discovery para responder en <2s (Req. 14.3)
    - Optimizar consultas de chat para latencia <300ms (Req. 14.2)
    - _Requisitos: 14.1, 14.2, 14.3_

  - [ ] 27.2 Optimizar rendimiento del frontend
    - Implementar `React.memo` y `useCallback` en componentes de lista pesados (`SwipeCardStack`, `MessageBubble`, `ConversationItem`)
    - Usar `FlashList` de Shopify en lugar de `FlatList` para listas largas (conversaciones, mensajes, matches)
    - Implementar lazy loading de imágenes con `expo-image` (reemplaza `Image` de React Native)
    - Configurar `windowSize` y `maxToRenderPerBatch` en listas de mensajes
    - _Requisitos: 14.1, 14.4_


---

## FASE 8 — Testing y QA

- [ ] 28. Completar cobertura de tests del backend
  - [ ] 28.1 Escribir tests unitarios para todos los casos de uso restantes
    - Tests para `DiscoveryModule`: generación de cola, aplicación de filtros, exclusiones
    - Tests para `MatchModule`: detección de match recíproco, creación de Conexión_Destacada
    - Tests para `ChatModule`: paginación de mensajes, archivado, eliminación selectiva
    - Tests para `NotificationModule`: respeto de preferencias, encolado para offline
    - Tests para `ModerationModule`: umbral de shadow ban, detección de spam
    - Alcanzar cobertura mínima: 85% líneas, 85% funciones, 80% ramas
    - _Requisitos: todos_

  - [ ] 28.2 Escribir tests de integración end-to-end del backend
    - Test de flujo completo: registro → onboarding → discovery → like → match → chat
    - Test de flujo de moderación: reporte → shadow ban → reducción de visibilidad
    - Test de rate limiting: verificar HTTP 429 al superar límites
    - Test de WebSocket: conexión autenticada, envío/recepción de mensajes, typing indicator
    - Usar base de datos PostgreSQL de test con `prisma migrate deploy`
    - _Requisitos: todos_

- [ ] 29. Completar cobertura de tests del frontend
  - [ ] 29.1 Escribir tests de componentes con React Native Testing Library
    - Tests para `SwipeCard`: renderizado, gestos de swipe, callbacks de acción
    - Tests para `MessageBubble`: renderizado de texto, imagen y emoji; diferenciación propio/ajeno
    - Tests para `LoginForm` y `RegisterForm`: validación Zod, manejo de errores de API
    - Tests para `OnboardingProgressManager`: persistencia y restauración de progreso
    - _Requisitos: 1.1, 9.2, 15.1–15.5_

  - [ ]* 29.2 Escribir tests E2E con Detox
    - Test E2E: flujo completo de registro y onboarding
    - Test E2E: flujo de discovery con swipe y match
    - Test E2E: envío y recepción de mensajes en tiempo real
    - Test E2E: flujo de reporte y bloqueo
    - Configurar Detox para iOS Simulator y Android Emulator
    - _Requisitos: todos los flujos principales_

- [ ] 30. Checkpoint final — MVP completo
  - Ejecutar suite completa de tests (unit + integration + property)
  - Verificar cobertura mínima (85% backend, 80% frontend)
  - Verificar que todos los requisitos de rendimiento se cumplen (95% peticiones <500ms, chat <300ms)
  - Asegurarse de que todos los tests pasan, consultar al usuario si hay dudas.

---

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requisitos específicos para trazabilidad completa
- Los checkpoints garantizan validación incremental del sistema
- Los property tests validan las 14 propiedades de corrección definidas en el diseño
- Los tests unitarios validan ejemplos específicos y casos borde
- El orden de las fases garantiza que no haya código huérfano: cada módulo se integra antes de avanzar
- **MVP:** Fases 0–6 (tareas 1–25)
- **Post-MVP:** Fases 7–8 (tareas 26–30) + funcionalidades avanzadas listadas abajo

### Post-MVP (fuera del alcance inicial)

- Sistema de stories/estados efímeros
- Videollamadas integradas
- Grupos de estudio
- Eventos universitarios
- Integración con calendario académico FESC
- Panel de administración web para moderadores
- Analytics y métricas de uso
- A/B testing del algoritmo de recomendaciones
- Soporte multi-idioma (español/inglés)


---

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "1.2"]
    },
    {
      "id": 1,
      "tasks": ["2.1", "3.1"]
    },
    {
      "id": 2,
      "tasks": ["2.2", "2.3", "3.2"]
    },
    {
      "id": 3,
      "tasks": ["2.4", "2.5", "3.3", "3.4"]
    },
    {
      "id": 4,
      "tasks": ["3.5", "5.1"]
    },
    {
      "id": 5,
      "tasks": ["5.2", "5.3"]
    },
    {
      "id": 6,
      "tasks": ["5.4", "5.5"]
    },
    {
      "id": 7,
      "tasks": ["5.6", "5.7"]
    },
    {
      "id": 8,
      "tasks": ["5.8", "6.1"]
    },
    {
      "id": 9,
      "tasks": ["5.9", "6.2"]
    },
    {
      "id": 10,
      "tasks": ["6.3", "6.4"]
    },
    {
      "id": 11,
      "tasks": ["8.1"]
    },
    {
      "id": 12,
      "tasks": ["8.2", "8.3"]
    },
    {
      "id": 13,
      "tasks": ["8.4"]
    },
    {
      "id": 14,
      "tasks": ["8.5", "9.1"]
    },
    {
      "id": 15,
      "tasks": ["8.6", "9.2", "10.1"]
    },
    {
      "id": 16,
      "tasks": ["9.3", "9.4", "10.2"]
    },
    {
      "id": 17,
      "tasks": ["10.3"]
    },
    {
      "id": 18,
      "tasks": ["12.1"]
    },
    {
      "id": 19,
      "tasks": ["12.2", "12.3"]
    },
    {
      "id": 20,
      "tasks": ["13.1"]
    },
    {
      "id": 21,
      "tasks": ["13.2", "13.3"]
    },
    {
      "id": 22,
      "tasks": ["13.4", "13.5", "14.1"]
    },
    {
      "id": 23,
      "tasks": ["14.2", "15.1"]
    },
    {
      "id": 24,
      "tasks": ["15.2"]
    },
    {
      "id": 25,
      "tasks": ["15.3", "15.4"]
    },
    {
      "id": 26,
      "tasks": ["17.1"]
    },
    {
      "id": 27,
      "tasks": ["17.2", "17.3"]
    },
    {
      "id": 28,
      "tasks": ["17.4"]
    },
    {
      "id": 29,
      "tasks": ["17.5", "18.1"]
    },
    {
      "id": 30,
      "tasks": ["17.6", "18.2"]
    },
    {
      "id": 31,
      "tasks": ["18.3"]
    },
    {
      "id": 32,
      "tasks": ["18.4", "18.5"]
    },
    {
      "id": 33,
      "tasks": ["20.1"]
    },
    {
      "id": 34,
      "tasks": ["20.2"]
    },
    {
      "id": 35,
      "tasks": ["20.3", "21.1"]
    },
    {
      "id": 36,
      "tasks": ["21.2"]
    },
    {
      "id": 37,
      "tasks": ["22.1"]
    },
    {
      "id": 38,
      "tasks": ["22.2"]
    },
    {
      "id": 39,
      "tasks": ["22.3", "22.4"]
    },
    {
      "id": 40,
      "tasks": ["22.5", "23.1"]
    },
    {
      "id": 41,
      "tasks": ["24.1", "24.2"]
    },
    {
      "id": 42,
      "tasks": ["26.1", "26.2"]
    },
    {
      "id": 43,
      "tasks": ["27.1", "27.2"]
    },
    {
      "id": 44,
      "tasks": ["28.1"]
    },
    {
      "id": 45,
      "tasks": ["28.2", "29.1"]
    },
    {
      "id": 46,
      "tasks": ["29.2"]
    }
  ]
}
```

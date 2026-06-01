# 🔍 FINDME — Red Social Universitaria FESC

App móvil estilo Tinder para estudiantes de la Universidad FESC, diseñada para que puedan conocerse, hacer conexiones significativas y comunicarse en tiempo real.

**Stack:** React Native (Expo) + Node.js + Socket.io + SQLite + JWT

---

## 👥 Integrantes del Equipo

| Nombre Completo | Código Estudiante |
|---|---|
| [Angel Nadin Vega Martinez] | [1028480796] |
| [Jann Pierre Ortiz Zambrano] | [1094045411] |


---

## 🛠️ Tecnologías Utilizadas

### Frontend (App Móvil)
- **Framework:** React Native (Expo)
- **Lenguaje:** TypeScript
- **Versión Node.js:** 18.x o superior
- **Dependencias principales:**
  - `expo` v50+
  - `react-native` v0.73+
  - `@react-navigation/native` v6+
  - `axios` (HTTP client)
  - `socket.io-client` (WebSockets en tiempo real)
  - `react-native-gesture-handler` (Animaciones y gestos)

### Backend
- **Framework:** Node.js + Express.js
- **Lenguaje:** JavaScript
- **Base de datos:** SQLite
- **Autenticación:** JWT (JSON Web Tokens)
- **Versión Node.js:** 18.x o superior
- **Dependencias principales:**
  - `express` v4.18+
  - `socket.io` v4.5+ (WebSockets)
  - `sqlite3` (Base de datos)
  - `jsonwebtoken` (JWT)
  - `bcryptjs` (Hashing de contraseñas)
  - `multer` (Subida de archivos)

---

## 🏗️ Arquitectura de la Aplicación

### Descripción General

FINDME utiliza una arquitectura **cliente-servidor** con comunicación en tiempo real:

```
┌─────────────────────────────────────────┐
│          FRONTEND (React Native)        │
│  ┌─────────────────────────────────┐   │
│  │  Screens (UI Components)        │   │
│  │  - LoginScreen                  │   │
│  │  - RegisterScreen               │   │
│  │  - OnboardingScreen             │   │
│  │  - DiscoverScreen (Swipe)       │   │
│  │  - ChatScreen                   │   │
│  │  - ProfileScreen                │   │
│  │  - EditProfileScreen            │   │
│  │  - MessagesScreen               │   │
│  │  - LikesScreen                  │   │
│  └─────────────────────────────────┘   │
│            ↓ HTTP + WebSocket           │
└────────────────┬────────────────────────┘
                 │
     ┌───────────┴───────────┐
     ↓                       ↓
  [REST API]          [WebSocket]
   Port 3001           Port 3001
     │                       │
┌────┴───────────────────────┴────────┐
│      BACKEND (Node.js Express)      │
│  ┌───────────────────────────────┐  │
│  │  Routes:                      │  │
│  │  - /auth (login, register)    │  │
│  │  - /users (perfiles)          │  │
│  │  - /discover (recomendaciones)│  │
│  │  - /likes (sistema de likes)  │  │
│  │  - /messages (chat)           │  │
│  │  - /upload (archivos)         │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  WebSocket Events:            │  │
│  │  - send_message              │  │
│  │  - typing_indicator          │  │
│  │  - user_online/offline       │  │
│  └───────────────────────────────┘  │
└────────────┬────────────────────────┘
             │
      ┌──────┴──────┐
      ↓             ↓
  [SQLite DB]   [Uploads]
  - users.db    - /uploads
```

### Flujo de Autenticación

1. **Registro:** Usuario se registra con email @fesc.edu.co → JWT y Refresh Token
2. **Login:** Valida credenciales → Retorna JWT (corta duración)
3. **Refresh:** JWT expirado → Usa Refresh Token para obtener nuevo JWT
4. **Protección:** Cada request incluye `Authorization: Bearer <JWT>`

---

## 📱 Especificaciones Funcionales

### Features Implementadas

| Feature | Estado | Descripción |
|---|---|---|
| **Autenticación** | ✅ | Registro con correo @fesc.edu.co + Login con JWT |
| **Refresh Token** | ✅ | Auto-renovación de sesión |
| **Onboarding** | ✅ | Fotos, bio, carrera e intereses del usuario |
| **Descubrimiento** | ✅ | Algoritmo de compatibilidad con swipe |
| **Gestos Swipe** | ✅ | Like ❤️ / Pass ❌ con animaciones |
| **Sistema de Likes** | ✅ | Ver quién te ha hecho like |
| **Matches Mutuos** | ✅ | Modal animado cuando ambos se dan like |
| **Chat en Tiempo Real** | ✅ | WebSocket bidireccional (Socket.io) |
| **Typing Indicator** | ✅ | "Escribiendo..." en tiempo real |
| **Read Receipts** | ✅ | Marcar mensajes como leídos |
| **Subida de Fotos** | ✅ | Perfil y galería (multer) |
| **Edición de Perfil** | ✅ | Cambiar foto, bio, carrera |
| **Filtros Descubrimiento** | ✅ | Por carrera, género, edad |
| **Bloquear Usuarios** | ✅ | Evitar ver perfiles específicos |
| **Reportar Usuarios** | ✅ | Reportar abuso |
| **Estado Online/Offline** | ✅ | Indicador en tiempo real |
| **Notificaciones Push** | ❌ | No implementado |
| **Verificación Email** | ❌ | Solo valida dominio @fesc.edu.co |

---

## 🚀 Instrucciones de Instalación y Ejecución

### Prerequisitos

```
- Node.js 18+
- npm o yarn
- Expo Go (en el celular)
- Git
```

### 1. Clonar Repositorio

```bash
git clone <tu-repo>
cd findme
```

### 2. Instalar Backend

```bash
cd backend
npm install
```

**Crear archivo `.env`:**

```env
PORT=3001
JWT_SECRET=tu_clave_secreta_muy_larga_y_segura_123456
JWT_REFRESH_SECRET=otra_clave_refresh_secreta_789012
NODE_ENV=development
```

**Iniciar Backend:**

```bash
npm run dev
```

Backend corre en: `http://localhost:3001`

### 3. Configurar IP para Dispositivo Móvil

Abre `frontend/src/config.ts` y reemplaza `localhost` con tu **IP local**:

```bash
# En Windows: abre CMD y escribe:
ipconfig

# Busca "Dirección IPv4" (ej: 192.168.1.100)
```

**Actualiza `frontend/src/config.ts`:**

```typescript
export const API_URL = 'http://192.168.1.100:3001';
export const SOCKET_URL = 'http://192.168.1.100:3001';
```

### 4. Instalar Frontend

```bash
cd frontend
npm install
```

**Iniciar App:**

```bash
npx expo start
```

**En tu celular:**
1. Descarga **Expo Go** (App Store o Google Play)
2. Escanea el código QR que aparece en la terminal
3. ¡La app se cargará automáticamente!

### 5. Deployment en Producción

#### Backend → Render.com

⚠️ **NO uses Vercel** — no soporta WebSockets persistentes.

1. Crea cuenta en [render.com](https://render.com)
2. "New Web Service" → Conecta GitHub
3. Selecciona carpeta: `/backend`
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Variables de entorno:
   - `JWT_SECRET` = (clave secreta larga)
   - `NODE_ENV` = `production`

Render te dará: `https://findme-backend.onrender.com`

#### App → EAS Build

```bash
cd frontend
npx eas build --platform android
# o para iOS:
npx eas build --platform ios
```

---

## 📸 Capturas de Pantalla

Aquí van las capturas de pantalla de todas las pantallas funcionando:

### Pantalla de Login
<img width="692" height="1308" alt="image" src="https://github.com/user-attachments/assets/6db44852-ad39-452e-af9a-dbd7ee8e28ee" />

### Pantalla de Registro
<img width="714" height="1309" alt="image" src="https://github.com/user-attachments/assets/9418e02d-e242-4f03-9dfc-51d6c578ad5f" />

### Pantalla de Onboarding
<img width="720" height="1142" alt="image" src="https://github.com/user-attachments/assets/8170989e-0cd3-4c0a-a091-c96cf58dd508" /> 
<img width="720" height="1114" alt="image" src="https://github.com/user-attachments/assets/62aa5572-e00d-494c-be79-5cf36226b954" /> 
<img width="720" height="1374" alt="image" src="https://github.com/user-attachments/assets/13e14ca5-a92b-4010-a8e8-22e90b08f3f9" /> 
<img width="720" height="1197" alt="image" src="https://github.com/user-attachments/assets/ac739689-cc3e-4010-9fe0-ca76d5dd06a9" />


### Pantalla de Descubrimiento (Swipe)
<img width="720" height="1339" alt="image" src="https://github.com/user-attachments/assets/90b08d18-2777-4a57-bc0d-38268d704e17" />

### Pantalla de Chat
<img width="720" height="1339" alt="image" src="https://github.com/user-attachments/assets/24f22938-b149-444f-b9dc-fb2edcc78878" />

### Pantalla de Perfil
<img width="720" height="1336" alt="image" src="https://github.com/user-attachments/assets/2316eefe-7289-473e-9a71-fd3fc6f2be64" />

### Pantalla de Edición de Perfil
<img width="720" height="1279" alt="image" src="https://github.com/user-attachments/assets/9fa6c3f8-7fa9-40b4-8c5d-67f71bf69da1" /> 
<img width="720" height="1290" alt="image" src="https://github.com/user-attachments/assets/31d6cf96-0e5c-4dba-bae3-e65fed973e11" />

### Pantalla de Mensajes
<img width="710" height="1346" alt="image" src="https://github.com/user-attachments/assets/9348ae60-229b-4c58-a57d-63f62edc5f0e" />

### Pantalla de Likes
<img width="720" height="1249" alt="image" src="https://github.com/user-attachments/assets/32a80020-89f3-4ba5-8004-ca41e3ac94fb" /> <img width="720" height="1373" alt="image" src="https://github.com/user-attachments/assets/15f12ef7-b641-4c0e-b197-28148e9906f0" />

### Modal de Match
<img width="720" height="1210" alt="image" src="https://github.com/user-attachments/assets/fdb7e46d-b740-4e08-b503-9d563e678d99" /> <img width="653" height="960" alt="image" src="https://github.com/user-attachments/assets/9ccb6457-0e25-4d33-b086-334662a411aa" />

---

## 🔌 Endpoints de Servicios Web Consumidos

### Autenticación

```
POST /auth/register
  Body: { email, password, fullName, carrera }
  Response: { user, accessToken, refreshToken }

POST /auth/login
  Body: { email, password }
  Response: { user, accessToken, refreshToken }

POST /auth/refresh
  Body: { refreshToken }
  Response: { accessToken }

POST /auth/logout
  Headers: { Authorization: Bearer <token> }
  Response: { message: "success" }
```

### Usuarios y Perfiles

```
GET /users/profile
  Headers: { Authorization: Bearer <token> }
  Response: { user }

PUT /users/profile
  Headers: { Authorization: Bearer <token> }
  Body: { fullName, bio, carrera, interests, age, gender }
  Response: { user }

POST /users/upload-photo
  Headers: { Authorization: Bearer <token> }
  Body: FormData { photo }
  Response: { photoUrl }

GET /users/:userId
  Headers: { Authorization: Bearer <token> }
  Response: { user }

POST /users/block/:userId
  Headers: { Authorization: Bearer <token> }
  Response: { message: "success" }

POST /users/report/:userId
  Headers: { Authorization: Bearer <token> }
  Body: { reason }
  Response: { message: "success" }
```

### Descubrimiento

```
GET /discover/profiles
  Headers: { Authorization: Bearer <token> }
  Query: { gender, carrera, ageMin, ageMax }
  Response: [{ id, name, photo, bio, carrera, interests }...]

GET /discover/recommendations
  Headers: { Authorization: Bearer <token> }
  Response: [{ compatibilidad, user }...]
```

### Likes y Matches

```
POST /likes/like/:userId
  Headers: { Authorization: Bearer <token> }
  Response: { match: true/false, matchedUser }

POST /likes/pass/:userId
  Headers: { Authorization: Bearer <token> }
  Response: { message: "success" }

GET /likes/incoming
  Headers: { Authorization: Bearer <token> }
  Response: [{ id, name, photo, likedAt }...]

GET /likes/matches
  Headers: { Authorization: Bearer <token> }
  Response: [{ id, name, photo, matchedAt }...]
```

### Mensajes

```
GET /messages/conversations
  Headers: { Authorization: Bearer <token> }
  Response: [{ userId, lastMessage, timestamp }...]

GET /messages/:userId
  Headers: { Authorization: Bearer <token> }
  Query: { limit, offset }
  Response: [{ id, text, sender, timestamp, read }...]

POST /messages
  Headers: { Authorization: Bearer <token> }
  Body: { recipientId, text }
  Response: { message }

PUT /messages/:messageId/read
  Headers: { Authorization: Bearer <token> }
  Response: { message: "success" }
```

### WebSocket Events (Socket.io)

```
emit: 'send_message', { recipientId, text }
on: 'receive_message', { senderId, text, timestamp }

emit: 'typing', { recipientId }
on: 'user_typing', { userId }

emit: 'stop_typing', { recipientId }
on: 'user_stopped_typing', { userId }

on: 'user_online', { userId }
on: 'user_offline', { userId }

on: 'new_like', { userId, name }
on: 'new_match', { userId, name }
```

---

## 🎨 Diseño y Estilo

- **Fondo Principal:** `#080808` (Negro puro)
- **Color de Acento:** Gradiente `#FF2D5B` → `#FF6B35` (Rosa a Naranja)
- **Tipografía:** Inter
- **Paleta:** Dark mode con glassmorphism
- **Animaciones:** Fluidas con React Native Animated API

---

## 📋 Requisitos del Sistema

- **Node.js:** 18.x o superior
- **npm:** 9.x o superior (o yarn 3.x+)
- **Expo Go:** Versión reciente (disponible en App Store / Google Play)
- **Espacio en disco:** 500MB mínimo
- **Conexión a internet:** Requerida para desarrollo y deployment

---

## 🎯 Conclusiones y Aprendizajes

### Lecciones Aprendidas

[Agrega aquí manualmente las conclusiones, desafíos enfrentados, y aprendizajes del proyecto]

### Desafíos

[Documentar los principales desafíos técnicos que enfrentaron]

### Mejoras Futuras

[Listar posibles mejoras y features adicionales para futuras versiones]

---

## 📄 Licencia

Este proyecto es propiedad de la Universidad FESC. Uso exclusivo educativo.

---

## 📧 Contacto

Para preguntas o soporte, contacta al equipo de desarrollo.

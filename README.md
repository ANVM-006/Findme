# 🔍 FINDME — Red Social Universitaria FESC

App mobile estilo Tinder para estudiantes de la Universidad FESC.  
Stack: React Native (Expo) + Node.js + Socket.io + SQLite + JWT

---

## 📁 Estructura del Proyecto

```
findme/
├── backend/     ← API REST + WebSockets + Base de datos
└── frontend/    ← App móvil React Native (Expo)
```

---

## 🚀 Cómo Correr Localmente

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

Corre en: `http://localhost:3001`

### 2. Configurar IP para el celular

Para que tu celular se conecte al backend desde la misma red WiFi:

1. Abre `frontend/src/config.ts`
2. Reemplaza `localhost` con la **IP local de tu PC** (ej: `192.168.1.100`)

```ts
export const API_URL = 'http://192.168.1.100:3001';
export const SOCKET_URL = 'http://192.168.1.100:3001';
```

Para encontrar tu IP en Windows: abre CMD y escribe `ipconfig` → busca "Dirección IPv4"

### 3. Frontend (App móvil)

```bash
cd frontend
npm install
npx expo start
```

Escanea el código QR con **Expo Go** en tu celular.

---

## ☁️ Deployment en Producción

### Backend → Render.com (GRATIS, soporta WebSockets)

> ⚠️ **NO uses Vercel para el backend** — Vercel es serverless y no soporta WebSockets persistentes (Socket.io).

1. Crea cuenta en [render.com](https://render.com)
2. "New Web Service" → conecta tu repositorio de GitHub
3. Selecciona la carpeta `backend/`
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Agrega variables de entorno:
   - `JWT_SECRET` = (clave secreta larga y aleatoria)
   - `NODE_ENV` = `production`
7. Render te dará una URL tipo: `https://findme-backend.onrender.com`

### App → Expo (distribución)

Una vez el backend esté desplegado:
1. Actualiza `frontend/src/config.ts` con la URL de Render
2. Para distribuir la app: `npx expo build:android` o usa EAS Build

---

## 🔧 Variables de Entorno (Backend)

Crea un archivo `backend/.env` (ya existe uno por defecto):

```env
PORT=3001
JWT_SECRET=tu_clave_secreta_muy_larga_y_segura
JWT_REFRESH_SECRET=tu_otra_clave_secreta_refresh
NODE_ENV=development
```

---

## 📱 Funcionalidades

| Feature | Estado |
|---|---|
| Registro con correo @fesc.edu.co | ✅ |
| Login + JWT con refresh automático | ✅ |
| Onboarding (foto + bio + intereses) | ✅ |
| Descubrimiento de perfiles (swipe) | ✅ |
| Gestos de swipe + botones ❌/❤️ | ✅ |
| Sistema de Likes y Matches | ✅ |
| Modal de Match animado | ✅ |
| Chat en tiempo real (WebSocket) | ✅ |
| Typing indicator + Read receipts | ✅ |
| Subida de fotos de perfil y galería | ✅ |
| Perfil editable (foto, bio, carrera) | ✅ |
| Filtros de descubrimiento | ✅ |
| Bloquear / Reportar usuarios | ✅ |
| Estado online/offline en tiempo real | ✅ |
| Notificaciones push | ❌ (omitido) |
| Verificación de correo | ❌ (omitido, solo valida dominio) |

---

## 🎨 Diseño

- **Fondo**: `#080808` (negro puro)
- **Acento**: `#FF2D5B` → `#FF6B35` (gradiente rosa-naranja)
- **Tipografía**: Inter
- **Estilo**: Dark mode, glassmorphism, animaciones fluidas

---

## 📋 Requisitos

- Node.js 18+
- Expo Go en el celular (iOS o Android)
- npm o yarn

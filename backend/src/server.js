'use strict';

require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const { initDB } = require('./db/database');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const discoverRoutes = require('./routes/discover');
const likesRoutes = require('./routes/likes');
const messagesRoutes = require('./routes/messages');
const { setupChatSocket } = require('./sockets/chat');

// ─── App Setup ────────────────────────────────────────────────────────────────

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Make Socket.io instance available in routes via req.app.get('io')
app.set('io', io);
app.set('trust proxy', 1);

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/discover', discoverRoutes);
app.use('/api/likes', likesRoutes);
app.use('/api/messages', messagesRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'FINDME Backend',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Multer file size/type errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'El archivo excede el tamaño máximo de 10MB' });
  }
  if (err.message && err.message.includes('Solo se permiten imágenes')) {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: 'Error interno del servidor' });
});

// ─── Socket.io ────────────────────────────────────────────────────────────────

setupChatSocket(io);

// ─── Start Server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;

(async () => {
  try {
    await initDB();
    server.listen(PORT, () => {
      console.log(`🚀 FINDME backend running on port ${PORT}`);
      console.log(`📡 Socket.io ready`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('❌ Failed to initialize database:', err);
    process.exit(1);
  }
})();

module.exports = { app, server };


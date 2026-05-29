'use strict';

const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'findme_super_secret_key_2024_change_in_production';

// Map of userId -> Set of socket IDs (a user may have multiple tabs/devices)
const onlineUsers = new Map();

function addOnlineUser(userId, socketId) {
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socketId);
}

function removeOnlineUser(userId, socketId) {
  const sockets = onlineUsers.get(userId);
  if (sockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) {
      onlineUsers.delete(userId);
    }
  }
}

function isUserOnline(userId) {
  return onlineUsers.has(userId) && onlineUsers.get(userId).size > 0;
}

/**
 * Sets up all Socket.io event handlers for real-time chat.
 * @param {import('socket.io').Server} io
 */
function setupChatSocket(io) {
  io.on('connection', (socket) => {
    // ── Authentication ────────────────────────────────────────────────────────
    const token = socket.handshake.auth.token;
    if (!token) {
      socket.emit('error', { message: 'Token de autenticación requerido' });
      socket.disconnect(true);
      return;
    }

    let userId;
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.userId;
    } catch (err) {
      socket.emit('error', { message: 'Token inválido o expirado' });
      socket.disconnect(true);
      return;
    }

    socket.userId = userId;

    // Register connection
    addOnlineUser(userId, socket.id);

    // Mark user online in DB
    const db = getDB();
    db.prepare('UPDATE users SET is_online = 1, last_seen = ? WHERE id = ?').run(
      new Date().toISOString(),
      userId
    );

    // Join personal notification room
    socket.join(`user_${userId}`);

    // Broadcast online status to all connected clients
    io.emit('user_online', { userId });

    console.log(`🟢 Socket connected: userId=${userId}, socketId=${socket.id}`);

    // ── join_conversation ──────────────────────────────────────────────────────
    socket.on('join_conversation', ({ conversationId }) => {
      if (!conversationId) return;

      const conv = db
        .prepare('SELECT * FROM conversations WHERE id = ?')
        .get(conversationId);

      if (!conv) {
        socket.emit('error', { message: 'Conversación no encontrada' });
        return;
      }

      if (conv.user1_id !== userId && conv.user2_id !== userId) {
        socket.emit('error', { message: 'No tienes acceso a esta conversación' });
        return;
      }

      socket.join(`conv_${conversationId}`);
      socket.emit('joined_conversation', { conversationId });
    });

    // ── send_message ──────────────────────────────────────────────────────────
    socket.on('send_message', ({ conversationId, content, type = 'text', tempId }) => {
      if (!conversationId || !content || typeof content !== 'string' || content.trim() === '') {
        socket.emit('error', { message: 'Datos de mensaje inválidos' });
        return;
      }

      const conv = db
        .prepare('SELECT * FROM conversations WHERE id = ?')
        .get(conversationId);

      if (!conv) {
        socket.emit('error', { message: 'Conversación no encontrada' });
        return;
      }

      if (conv.user1_id !== userId && conv.user2_id !== userId) {
        socket.emit('error', { message: 'No tienes acceso a esta conversación' });
        return;
      }

      const msgId = uuidv4();
      const now = new Date().toISOString();

      db.prepare(
        `INSERT INTO messages (id, conversation_id, sender_id, content, msg_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(msgId, conversationId, userId, content.trim(), type, now);

      db.prepare(
        'UPDATE conversations SET last_message_at = ? WHERE id = ?'
      ).run(now, conversationId);

      const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(msgId);
      const sender = db.prepare('SELECT id, name, profile_photo FROM users WHERE id = ?').get(userId);

      // ✅ 1. Enviar confirmación al remitente con tempId -> messageId mapping
      if (tempId) {
        socket.emit('message_sent', {
          tempId,
          messageId: msgId,
          success: true,
        });
        console.log(`[Socket] message_sent confirmación: ${tempId} -> ${msgId}`);
      }

      // ✅ 2. Broadcast del nuevo mensaje a todos en la sala
      io.to(`conv_${conversationId}`).emit('new_message', message);
      console.log(`[Socket] new_message broadcast a conv_${conversationId}: ${msgId}`);
    });

    // ── typing ────────────────────────────────────────────────────────────────
    socket.on('typing', ({ conversationId }) => {
      if (!conversationId) return;

      const conv = db
        .prepare('SELECT * FROM conversations WHERE id = ?')
        .get(conversationId);

      if (!conv) return;
      if (conv.user1_id !== userId && conv.user2_id !== userId) return;

      // Broadcast to room but NOT back to the sender
      socket.to(`conv_${conversationId}`).emit('user_typing', {
        conversationId,
        userId,
      });
    });

    // ── mark_read ─────────────────────────────────────────────────────────────
    socket.on('mark_read', ({ conversationId }) => {
      if (!conversationId) return;

      const conv = db
        .prepare('SELECT * FROM conversations WHERE id = ?')
        .get(conversationId);

      if (!conv) return;
      if (conv.user1_id !== userId && conv.user2_id !== userId) return;

      db.prepare(
        `UPDATE messages
         SET is_read = 1
         WHERE conversation_id = ?
           AND sender_id != ?
           AND is_read = 0`
      ).run(conversationId, userId);

      io.to(`conv_${conversationId}`).emit('messages_read', {
        conversationId,
        readBy: userId,
      });
    });

    // ── disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      removeOnlineUser(userId, socket.id);

      // Only mark offline in DB if no other sockets remain for this user
      if (!isUserOnline(userId)) {
        const now = new Date().toISOString();
        db.prepare('UPDATE users SET is_online = 0, last_seen = ? WHERE id = ?').run(
          now,
          userId
        );
        io.emit('user_offline', { userId });
        console.log(`🔴 Socket disconnected: userId=${userId}, socketId=${socket.id}`);
      }
    });
  });
}

module.exports = { setupChatSocket };

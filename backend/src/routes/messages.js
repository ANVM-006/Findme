'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBaseUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

function buildPhotoUrl(filename, baseUrl) {
  if (!filename) return null;
  if (filename.startsWith('http://') || filename.startsWith('https://')) return filename;
  return `${baseUrl}/uploads/${filename}`;
}

function getOtherUserId(conversation, myId) {
  return conversation.user1_id === myId ? conversation.user2_id : conversation.user1_id;
}

function getPublicUser(userId, baseUrl) {
  const db = getDB();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return null;
  const { password_hash, ...rest } = user;
  return {
    ...rest,
    profile_photo: buildPhotoUrl(user.profile_photo, baseUrl),
  };
}

// ─── GET /conversations ───────────────────────────────────────────────────────

router.get('/conversations', (req, res) => {
  try {
    const db = getDB();
    const baseUrl = getBaseUrl(req);

    const convs = db
      .prepare(
        `SELECT * FROM conversations
         WHERE user1_id = ? OR user2_id = ?
         ORDER BY last_message_at DESC NULLS LAST`
      )
      .all(req.userId, req.userId);

    const result = convs.map((conv) => {
      const otherUserId = getOtherUserId(conv, req.userId);
      const otherUser = getPublicUser(otherUserId, baseUrl);

      const lastMessage = db
        .prepare(
          `SELECT * FROM messages
           WHERE conversation_id = ?
           ORDER BY created_at DESC
           LIMIT 1`
        )
        .get(conv.id);

      const unreadCount = db
        .prepare(
          `SELECT COUNT(*) as count FROM messages
           WHERE conversation_id = ?
             AND sender_id != ?
             AND is_read = 0`
        )
        .get(conv.id, req.userId).count;

      return {
        id: conv.id,
        created_at: conv.created_at,
        last_message_at: conv.last_message_at,
        other_user: otherUser,
        last_message: lastMessage || null,
        unread_count: unreadCount,
      };
    });

    return res.json({ conversations: result });
  } catch (err) {
    console.error('GET /conversations error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── GET /conversations/:id ───────────────────────────────────────────────────

router.get('/conversations/:id', (req, res) => {
  try {
    const db = getDB();
    const baseUrl = getBaseUrl(req);
    const conversationId = req.params.id;

    const conv = db
      .prepare('SELECT * FROM conversations WHERE id = ?')
      .get(conversationId);

    if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' });

    if (conv.user1_id !== req.userId && conv.user2_id !== req.userId) {
      return res.status(403).json({ error: 'Acceso no autorizado' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const messages = db
      .prepare(
        `SELECT * FROM messages
         WHERE conversation_id = ?
         ORDER BY created_at ASC
         LIMIT ? OFFSET ?`
      )
      .all(conversationId, limit, offset);

    // Mark received messages as read
    db.prepare(
      `UPDATE messages
       SET is_read = 1
       WHERE conversation_id = ?
         AND sender_id != ?
         AND is_read = 0`
    ).run(conversationId, req.userId);

    const otherUserId = getOtherUserId(conv, req.userId);
    const otherUser = getPublicUser(otherUserId, baseUrl);

    return res.json({
      conversation: {
        id: conv.id,
        other_user: otherUser,
        created_at: conv.created_at,
        last_message_at: conv.last_message_at,
      },
      messages,
      page,
      limit,
    });
  } catch (err) {
    console.error('GET /conversations/:id error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST /conversations ──────────────────────────────────────────────────────

router.post('/conversations', (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId es requerido' });
    }

    if (userId === req.userId) {
      return res.status(400).json({ error: 'No puedes crear una conversación contigo mismo' });
    }

    const db = getDB();

    // Check if other user exists
    const otherUser = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!otherUser) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Find existing conversation
    const existing = db
      .prepare(
        `SELECT * FROM conversations
         WHERE (user1_id = ? AND user2_id = ?)
            OR (user1_id = ? AND user2_id = ?)`
      )
      .get(req.userId, userId, userId, req.userId);

    if (existing) {
      return res.json({ conversationId: existing.id, conversation: existing });
    }

    // Create new conversation
    const convId = uuidv4();
    db.prepare(
      'INSERT INTO conversations (id, user1_id, user2_id) VALUES (?, ?, ?)'
    ).run(convId, req.userId, userId);

    const conversation = db
      .prepare('SELECT * FROM conversations WHERE id = ?')
      .get(convId);

    return res.status(201).json({ conversationId: convId, conversation });
  } catch (err) {
    console.error('POST /conversations error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;

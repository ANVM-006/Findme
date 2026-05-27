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

function buildProfile(user, photos, interests, baseUrl) {
  const { password_hash, ...rest } = user;
  return {
    ...rest,
    profile_photo: buildPhotoUrl(user.profile_photo, baseUrl),
    photos: photos.map((p) => ({
      id: p.id,
      photo_url: buildPhotoUrl(p.photo_url, baseUrl),
      order_index: p.order_index,
    })),
    interests: interests.map((r) => r.interest),
  };
}

function getFullProfile(userId, baseUrl) {
  const db = getDB();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return null;
  const photos = db
    .prepare('SELECT id, photo_url, order_index FROM user_photos WHERE user_id = ? ORDER BY order_index ASC')
    .all(userId);
  const interests = db.prepare('SELECT interest FROM user_interests WHERE user_id = ?').all(userId);
  return buildProfile(user, photos, interests, baseUrl);
}

function ensureConversation(db, userA, userB) {
  const existing = db
    .prepare(
      `SELECT id FROM conversations
       WHERE (user1_id = ? AND user2_id = ?)
          OR (user1_id = ? AND user2_id = ?)`
    )
    .get(userA, userB, userB, userA);

  if (existing) return existing.id;

  const convId = uuidv4();
  db.prepare(
    'INSERT INTO conversations (id, user1_id, user2_id) VALUES (?, ?, ?)'
  ).run(convId, userA, userB);
  return convId;
}

// ─── POST /:userId ─────────────────────────────────────────────────────────────

router.post('/:userId', (req, res) => {
  try {
    const toUserId = req.params.userId;
    const fromUserId = req.userId;

    if (toUserId === fromUserId) {
      return res.status(400).json({ error: 'No puedes darte like a ti mismo' });
    }

    const db = getDB();

    // Insert like; ignore if already exists (UNIQUE constraint)
    try {
      db.prepare(
        'INSERT INTO likes (id, from_user_id, to_user_id) VALUES (?, ?, ?)'
      ).run(uuidv4(), fromUserId, toUserId);
    } catch (e) {
      if (!e.message || !e.message.includes('UNIQUE')) throw e;
      // Like already exists — still check for match
    }

    // Check for mutual like
    const mutualLike = db
      .prepare(
        'SELECT id FROM likes WHERE from_user_id = ? AND to_user_id = ?'
      )
      .get(toUserId, fromUserId);

    let isMatch = false;
    let conversationId = null;

    if (mutualLike) {
      isMatch = true;
      conversationId = ensureConversation(db, fromUserId, toUserId);

      const baseUrl = getBaseUrl(req);
      const io = req.app.get('io');

      if (io) {
        const myProfile = getFullProfile(fromUserId, baseUrl);
        const theirProfile = getFullProfile(toUserId, baseUrl);

        // Notify the person who was just liked
        io.to(`user_${toUserId}`).emit('new_match', {
          matchedUser: myProfile,
          conversationId,
        });

        // Notify the current user
        io.to(`user_${fromUserId}`).emit('new_match', {
          matchedUser: theirProfile,
          conversationId,
        });
      }
    }

    return res.json({ liked: true, isMatch, conversationId });
  } catch (err) {
    console.error('POST /likes/:userId error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST /pass/:userId ───────────────────────────────────────────────────────

router.post('/pass/:userId', (req, res) => {
  try {
    const toUserId = req.params.userId;

    if (toUserId === req.userId) {
      return res.status(400).json({ error: 'No puedes pasarte a ti mismo' });
    }

    const db = getDB();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    try {
      db.prepare(
        'INSERT INTO passes (id, from_user_id, to_user_id, expires_at) VALUES (?, ?, ?, ?)'
      ).run(uuidv4(), req.userId, toUserId, expiresAt);
    } catch (e) {
      if (e.message && e.message.includes('UNIQUE')) {
        // Update expires_at if pass already exists (re-pass)
        db.prepare(
          'UPDATE passes SET expires_at = ? WHERE from_user_id = ? AND to_user_id = ?'
        ).run(expiresAt, req.userId, toUserId);
      } else {
        throw e;
      }
    }

    return res.json({ passed: true });
  } catch (err) {
    console.error('POST /likes/pass/:userId error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── GET /received ────────────────────────────────────────────────────────────

router.get('/received', (req, res) => {
  try {
    const db = getDB();
    const baseUrl = getBaseUrl(req);

    // Users who liked me, excluding those I've already liked back or blocked
    const rows = db
      .prepare(
        `SELECT l.from_user_id
         FROM likes l
         WHERE l.to_user_id = ?
           AND l.from_user_id NOT IN (
             SELECT to_user_id FROM likes WHERE from_user_id = ?
           )
           AND l.from_user_id NOT IN (
             SELECT blocked_id FROM blocks WHERE blocker_id = ?
           )
           AND l.from_user_id NOT IN (
             SELECT blocker_id FROM blocks WHERE blocked_id = ?
           )`
      )
      .all(req.userId, req.userId, req.userId, req.userId);

    const profiles = rows.map((r) => getFullProfile(r.from_user_id, baseUrl)).filter(Boolean);

    return res.json({ received: profiles });
  } catch (err) {
    console.error('GET /likes/received error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── GET /matches ─────────────────────────────────────────────────────────────

router.get('/matches', (req, res) => {
  try {
    const db = getDB();
    const baseUrl = getBaseUrl(req);

    // Mutual likes: I liked them AND they liked me
    const rows = db
      .prepare(
        `SELECT l1.to_user_id AS matched_user_id
         FROM likes l1
         INNER JOIN likes l2
           ON l1.from_user_id = l2.to_user_id
          AND l1.to_user_id   = l2.from_user_id
         WHERE l1.from_user_id = ?`
      )
      .all(req.userId);

    const matches = rows.map((r) => {
      const profile = getFullProfile(r.matched_user_id, baseUrl);
      if (!profile) return null;

      const conv = db
        .prepare(
          `SELECT id FROM conversations
           WHERE (user1_id = ? AND user2_id = ?)
              OR (user1_id = ? AND user2_id = ?)`
        )
        .get(req.userId, r.matched_user_id, r.matched_user_id, req.userId);

      return { ...profile, conversation_id: conv ? conv.id : null };
    }).filter(Boolean);

    return res.json({ matches });
  } catch (err) {
    console.error('GET /likes/matches error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;

'use strict';

const express = require('express');
const { getDB } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// ─── Helper ───────────────────────────────────────────────────────────────────

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

function getCompatibilityScore(db, userId, targetId) {
  const myInterests = db
    .prepare('SELECT interest FROM user_interests WHERE user_id = ?')
    .all(userId)
    .map((r) => r.interest);

  const theirInterests = new Set(
    db
      .prepare('SELECT interest FROM user_interests WHERE user_id = ?')
      .all(targetId)
      .map((r) => r.interest)
  );

  const shared = myInterests.filter((i) => theirInterests.has(i)).length;
  return Math.min(shared * 10, 100);
}

// ─── GET / ────────────────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  try {
    const db = getDB();
    const baseUrl = getBaseUrl(req);

    const career = req.query.career || null;
    const semester = req.query.semester ? parseInt(req.query.semester, 10) : null;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const now = new Date().toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Collect IDs to exclude
    const likedIds = db
      .prepare('SELECT to_user_id FROM likes WHERE from_user_id = ?')
      .all(req.userId)
      .map((r) => r.to_user_id);

    const passedIds = db
      .prepare(
        "SELECT to_user_id FROM passes WHERE from_user_id = ? AND expires_at > ?"
      )
      .all(req.userId, now)
      .map((r) => r.to_user_id);

    const blockedByMeIds = db
      .prepare('SELECT blocked_id FROM blocks WHERE blocker_id = ?')
      .all(req.userId)
      .map((r) => r.blocked_id);

    const blockedMeIds = db
      .prepare('SELECT blocker_id FROM blocks WHERE blocked_id = ?')
      .all(req.userId)
      .map((r) => r.blocker_id);

    const excludeIds = [
      req.userId,
      ...likedIds,
      ...passedIds,
      ...blockedByMeIds,
      ...blockedMeIds,
    ];

    // Build placeholders for IN clause
    const placeholders = excludeIds.map(() => '?').join(', ');
    const conditions = [`id NOT IN (${placeholders})`];
    const params = [...excludeIds];

    if (career) {
      conditions.push('career LIKE ?');
      params.push(`%${career}%`);
    }

    if (semester !== null && !isNaN(semester)) {
      conditions.push('semester = ?');
      params.push(semester);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit, offset);
    const users = db
      .prepare(
        `SELECT * FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .all(...params);

    const result = users.map((user) => {
      const photos = db
        .prepare(
          'SELECT id, photo_url, order_index FROM user_photos WHERE user_id = ? ORDER BY order_index ASC'
        )
        .all(user.id);
      const interests = db
        .prepare('SELECT interest FROM user_interests WHERE user_id = ?')
        .all(user.id);
      const compatibility_score = getCompatibilityScore(db, req.userId, user.id);
      return {
        ...buildProfile(user, photos, interests, baseUrl),
        compatibility_score,
      };
    });

    return res.json({ users: result, page, limit });
  } catch (err) {
    console.error('GET /discover error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;

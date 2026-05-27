'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// ─── Helper ──────────────────────────────────────────────────────────────────

function getBaseUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

function buildPhotoUrl(filename, baseUrl) {
  if (!filename) return null;
  if (filename.startsWith('http://') || filename.startsWith('https://')) return filename;
  return `${baseUrl}/uploads/${filename}`;
}

function getUserProfile(userId, baseUrl) {
  const db = getDB();

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return null;

  const photos = db
    .prepare(
      'SELECT id, photo_url, order_index FROM user_photos WHERE user_id = ? ORDER BY order_index ASC'
    )
    .all(userId);

  const interestRows = db
    .prepare('SELECT interest FROM user_interests WHERE user_id = ?')
    .all(userId);

  const { password_hash, ...rest } = user;

  return {
    ...rest,
    profile_photo: buildPhotoUrl(user.profile_photo, baseUrl),
    photos: photos.map((p) => ({
      id: p.id,
      photo_url: buildPhotoUrl(p.photo_url, baseUrl),
      order_index: p.order_index,
    })),
    interests: interestRows.map((r) => r.interest),
  };
}

// ─── GET /me ─────────────────────────────────────────────────────────────────

router.get('/me', (req, res) => {
  try {
    const profile = getUserProfile(req.userId, getBaseUrl(req));
    if (!profile) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.json(profile);
  } catch (err) {
    console.error('GET /me error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── PUT /me ─────────────────────────────────────────────────────────────────

router.put('/me', (req, res) => {
  try {
    const { name, age, career, semester, bio } = req.body;
    const db = getDB();

    const fields = [];
    const values = [];

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'El nombre no puede estar vacío' });
      }
      fields.push('name = ?');
      values.push(name.trim());
    }
    if (age !== undefined) {
      fields.push('age = ?');
      values.push(Number(age));
    }
    if (career !== undefined) {
      fields.push('career = ?');
      values.push(career);
    }
    if (semester !== undefined) {
      fields.push('semester = ?');
      values.push(Number(semester));
    }
    if (bio !== undefined) {
      fields.push('bio = ?');
      values.push(bio);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    values.push(req.userId);
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const profile = getUserProfile(req.userId, getBaseUrl(req));
    return res.json(profile);
  } catch (err) {
    console.error('PUT /me error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST /me/photo ───────────────────────────────────────────────────────────

router.post('/me/photo', upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ninguna foto' });
    }

    const db = getDB();
    db.prepare('UPDATE users SET profile_photo = ? WHERE id = ?').run(
      req.file.filename,
      req.userId
    );

    const profile = getUserProfile(req.userId, getBaseUrl(req));
    return res.json(profile);
  } catch (err) {
    console.error('POST /me/photo error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST /me/photos ──────────────────────────────────────────────────────────

router.post('/me/photos', upload.array('photos', 6), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron fotos' });
    }

    const db = getDB();

    const existingCount = db
      .prepare('SELECT COUNT(*) as count FROM user_photos WHERE user_id = ?')
      .get(req.userId).count;

    if (existingCount >= 6) {
      return res.status(400).json({ error: 'Ya tienes el máximo de 6 fotos' });
    }

    const availableSlots = 6 - existingCount;
    const filesToInsert = req.files.slice(0, availableSlots);

    const insertPhoto = db.prepare(
      'INSERT INTO user_photos (id, user_id, photo_url, order_index) VALUES (?, ?, ?, ?)'
    );

    const insertMany = db.transaction((files) => {
      files.forEach((file, idx) => {
        insertPhoto.run(uuidv4(), req.userId, file.filename, existingCount + idx);
      });
    });

    insertMany(filesToInsert);

    const baseUrl = getBaseUrl(req);
    const photos = db
      .prepare(
        'SELECT id, photo_url, order_index FROM user_photos WHERE user_id = ? ORDER BY order_index ASC'
      )
      .all(req.userId)
      .map((p) => ({
        id: p.id,
        photo_url: buildPhotoUrl(p.photo_url, baseUrl),
        order_index: p.order_index,
      }));

    return res.json({ photos });
  } catch (err) {
    console.error('POST /me/photos error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── DELETE /me/photos/:photoId ───────────────────────────────────────────────

router.delete('/me/photos/:photoId', (req, res) => {
  try {
    const db = getDB();
    const photo = db
      .prepare('SELECT * FROM user_photos WHERE id = ? AND user_id = ?')
      .get(req.params.photoId, req.userId);

    if (!photo) {
      return res.status(404).json({ error: 'Foto no encontrada' });
    }

    db.prepare('DELETE FROM user_photos WHERE id = ?').run(req.params.photoId);

    return res.json({ message: 'Foto eliminada correctamente' });
  } catch (err) {
    console.error('DELETE /me/photos/:photoId error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── PUT /me/interests ────────────────────────────────────────────────────────

router.put('/me/interests', (req, res) => {
  try {
    const { interests } = req.body;
    if (!Array.isArray(interests)) {
      return res.status(400).json({ error: 'interests debe ser un array' });
    }

    const db = getDB();

    const upsertInterests = db.transaction((interestList) => {
      db.prepare('DELETE FROM user_interests WHERE user_id = ?').run(req.userId);
      const insert = db.prepare(
        'INSERT INTO user_interests (id, user_id, interest) VALUES (?, ?, ?)'
      );
      interestList.forEach((interest) => {
        if (typeof interest === 'string' && interest.trim().length > 0) {
          insert.run(uuidv4(), req.userId, interest.trim());
        }
      });
    });

    upsertInterests(interests);

    const updated = db
      .prepare('SELECT interest FROM user_interests WHERE user_id = ?')
      .all(req.userId)
      .map((r) => r.interest);

    return res.json({ interests: updated });
  } catch (err) {
    console.error('PUT /me/interests error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── GET /:id ─────────────────────────────────────────────────────────────────

router.get('/:id', (req, res) => {
  try {
    const targetId = req.params.id;
    const baseUrl = getBaseUrl(req);
    const db = getDB();

    const profile = getUserProfile(targetId, baseUrl);
    if (!profile) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Calculate compatibility score based on shared interests
    const myInterests = db
      .prepare('SELECT interest FROM user_interests WHERE user_id = ?')
      .all(req.userId)
      .map((r) => r.interest);

    const theirInterests = new Set(
      db
        .prepare('SELECT interest FROM user_interests WHERE user_id = ?')
        .all(targetId)
        .map((r) => r.interest)
    );

    const shared = myInterests.filter((i) => theirInterests.has(i)).length;
    const compatibility_score = Math.min(shared * 10, 100);

    return res.json({ ...profile, compatibility_score });
  } catch (err) {
    console.error('GET /:id error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST /block/:userId ──────────────────────────────────────────────────────

router.post('/block/:userId', (req, res) => {
  try {
    const blockedId = req.params.userId;
    if (blockedId === req.userId) {
      return res.status(400).json({ error: 'No puedes bloquearte a ti mismo' });
    }

    const db = getDB();
    const id = uuidv4();

    try {
      db.prepare(
        'INSERT INTO blocks (id, blocker_id, blocked_id) VALUES (?, ?, ?)'
      ).run(id, req.userId, blockedId);
    } catch (e) {
      if (e.message && e.message.includes('UNIQUE')) {
        return res.status(409).json({ error: 'Ya bloqueaste a este usuario' });
      }
      throw e;
    }

    return res.json({ message: 'Usuario bloqueado' });
  } catch (err) {
    console.error('POST /block/:userId error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST /report/:userId ─────────────────────────────────────────────────────

router.post('/report/:userId', (req, res) => {
  try {
    const reportedId = req.params.userId;
    const { category, description } = req.body;

    const validCategories = [
      'contenido_inapropiado',
      'acoso',
      'spam',
      'perfil_falso',
      'otro',
    ];

    if (!validCategories.includes(category)) {
      return res.status(400).json({
        error: `Categoría inválida. Opciones: ${validCategories.join(', ')}`,
      });
    }

    if (reportedId === req.userId) {
      return res.status(400).json({ error: 'No puedes reportarte a ti mismo' });
    }

    const db = getDB();
    db.prepare(
      'INSERT INTO reports (id, reporter_id, reported_id, category, description) VALUES (?, ?, ?, ?, ?)'
    ).run(uuidv4(), req.userId, reportedId, category, description || null);

    return res.json({ message: 'Reporte enviado correctamente' });
  } catch (err) {
    console.error('POST /report/:userId error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;

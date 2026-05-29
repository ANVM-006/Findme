'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db/database');
const { generateTokens, JWT_REFRESH_SECRET } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

const router = express.Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

const FESC_DOMAIN = '@fesc.edu.co';

function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return email.toLowerCase().endsWith(FESC_DOMAIN);
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

function storeRefreshToken(db, userId, refreshToken) {
  const id = uuidv4();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    `INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`
  ).run(id, userId, refreshToken, expiresAt);
}

function safeUser(user) {
  if (!user) return null;
  const { password_hash, ...rest } = user;
  return rest;
}

// ─── POST /register ──────────────────────────────────────────────────────────

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, age, career } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        error: `El correo debe pertenecer al dominio ${FESC_DOMAIN}`,
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        error:
          'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número',
      });
    }

    const db = getDB();

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    // Insert with age and career if provided
    const ageVal = age ? Number(age) : null;
    const careerVal = career && typeof career === 'string' ? career.trim() : null;

    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, age, career) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(userId, email.toLowerCase(), password_hash, name.trim(), ageVal, careerVal);

    const { accessToken, refreshToken } = generateTokens(userId);
    storeRefreshToken(db, userId, refreshToken);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    return res.status(201).json({
      accessToken,
      refreshToken,
      user: safeUser(user),
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST /login ─────────────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
    }

    const db = getDB();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    storeRefreshToken(db, user.id, refreshToken);

    // Mark user as online
    const now = new Date().toISOString();
    db.prepare('UPDATE users SET is_online = 1, last_seen = ? WHERE id = ?').run(now, user.id);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);

    return res.json({
      accessToken,
      refreshToken,
      user: safeUser(updatedUser),
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST /refresh ────────────────────────────────────────────────────────────

router.post('/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token requerido' });
    }

    const db = getDB();

    const stored = db
      .prepare('SELECT * FROM refresh_tokens WHERE token = ?')
      .get(refreshToken);

    if (!stored) {
      return res.status(401).json({ error: 'Refresh token inválido' });
    }

    if (new Date(stored.expires_at) < new Date()) {
      db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(stored.id);
      return res.status(401).json({ error: 'Refresh token expirado' });
    }

    // Verify JWT signature
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch {
      db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(stored.id);
      return res.status(401).json({ error: 'Refresh token inválido' });
    }

    // Delete old token
    db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(stored.id);

    // Generate and store new pair
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);
    storeRefreshToken(db, decoded.userId, newRefreshToken);

    return res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error('Refresh error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST /logout ─────────────────────────────────────────────────────────────

router.post('/logout', (req, res) => {
  try {
    const { refreshToken } = req.body;

    const db = getDB();

    if (refreshToken) {
      const stored = db
        .prepare('SELECT * FROM refresh_tokens WHERE token = ?')
        .get(refreshToken);

      if (stored) {
        // Mark user offline
        const now = new Date().toISOString();
        db.prepare('UPDATE users SET is_online = 0, last_seen = ? WHERE id = ?').run(
          now,
          stored.user_id
        );
        db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refreshToken);
      }
    }

    return res.json({ message: 'Sesión cerrada' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;

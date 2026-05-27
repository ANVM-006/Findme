'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'findme_super_secret_key_2024_change_in_production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'findme_refresh_secret_key_2024';

/**
 * Express middleware that verifies the Bearer JWT in the Authorization header.
 * Sets req.userId on success, returns 401 on failure.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  const token = authHeader.slice(7); // remove 'Bearer '

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
}

/**
 * Generates an access token (15 min) and a refresh token (30 days).
 * @param {string} userId
 * @returns {{ accessToken: string, refreshToken: string }}
 */
function generateTokens(userId) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '30d' });
  return { accessToken, refreshToken };
}

module.exports = { authMiddleware, generateTokens, JWT_SECRET, JWT_REFRESH_SECRET };

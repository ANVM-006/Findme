'use strict';

/**
 * SQLite database using sql.js (pure WebAssembly — no native compilation needed).
 * Provides a synchronous API compatible with better-sqlite3 so all routes
 * work without modification.
 */

const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../findme.db');

let dbWrapper = null;

// ─── Compatibility Wrapper ────────────────────────────────────────────────────

class SQLiteWrapper {
  constructor(sqlDb) {
    this._db = sqlDb;
  }

  /** Normalise variadic / array params into a plain array */
  _p(params) {
    if (params.length === 0) return [];
    if (params.length === 1 && Array.isArray(params[0])) return params[0];
    return params;
  }

  /** Persist the in-memory database to disk after every write */
  _save() {
    const data = this._db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }

  /**
   * Run one or more SQL statements without parameters (schema creation, pragmas).
   * Mirrors better-sqlite3's db.exec().
   */
  exec(sql) {
    this._db.run(sql);
    this._save();
    return this;
  }

  /**
   * Mirrors better-sqlite3's db.pragma() — executed as a PRAGMA statement.
   */
  pragma(statement) {
    this._db.run(`PRAGMA ${statement}`);
    return this;
  }

  /**
   * Returns a statement-like object with run / get / all methods,
   * mirroring better-sqlite3's db.prepare() API.
   */
  prepare(sql) {
    const self = this;
    return {
      /**
       * Execute a write statement (INSERT / UPDATE / DELETE).
       * Returns { changes: 1 } to be compatible with callers that
       * check the result.
       */
      run(...params) {
        const p = self._p(params);
        self._db.run(sql, p.length > 0 ? p : undefined);
        self._save();
        return { changes: 1 };
      },

      /**
       * Fetch a single row. Returns a plain object or undefined.
       */
      get(...params) {
        const p = self._p(params);
        const stmt = self._db.prepare(sql);
        if (p.length > 0) stmt.bind(p);
        let result;
        if (stmt.step()) {
          result = stmt.getAsObject();
          // sql.js returns 0/1 for booleans and numbers for INTEGER columns —
          // identical to better-sqlite3 behaviour.
        }
        stmt.free();
        return result;
      },

      /**
       * Fetch all matching rows as an array of plain objects.
       */
      all(...params) {
        const p = self._p(params);
        const stmt = self._db.prepare(sql);
        if (p.length > 0) stmt.bind(p);
        const rows = [];
        while (stmt.step()) {
          rows.push({ ...stmt.getAsObject() });
        }
        stmt.free();
        return rows;
      },
    };
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

/**
 * Async because sql.js must load its WASM binary first.
 * Call once at startup; all subsequent calls can use getDB().
 */
async function initDB() {
  // sql.js ships the WASM file inside the package; locate it correctly.
  const initSqlJs = require('sql.js');
  const wasmPath = path.join(
    require.resolve('sql.js'),
    '../../dist/sql-wasm.wasm'
  );

  const SQL = await initSqlJs({
    locateFile: () => wasmPath,
  });

  let sqlDb;
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(fileBuffer);
  } else {
    sqlDb = new SQL.Database();
  }

  // Enable WAL mode and foreign-key enforcement
  sqlDb.run('PRAGMA journal_mode = WAL;');
  sqlDb.run('PRAGMA foreign_keys = ON;');

  dbWrapper = new SQLiteWrapper(sqlDb);

  // ── Schema ──────────────────────────────────────────────────────────────────
  // Each statement is run individually to avoid multi-statement parse issues
  // with sql.js.

  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name          TEXT NOT NULL,
      age           INTEGER,
      career        TEXT,
      semester      INTEGER,
      bio           TEXT,
      profile_photo TEXT,
      is_online     INTEGER DEFAULT 0,
      last_seen     TEXT,
      created_at    TEXT DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS user_photos (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      photo_url   TEXT NOT NULL,
      order_index INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS user_interests (
      id       TEXT PRIMARY KEY,
      user_id  TEXT NOT NULL,
      interest TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS likes (
      id           TEXT PRIMARY KEY,
      from_user_id TEXT NOT NULL,
      to_user_id   TEXT NOT NULL,
      created_at   TEXT DEFAULT (datetime('now')),
      UNIQUE(from_user_id, to_user_id),
      FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (to_user_id)   REFERENCES users(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS passes (
      id           TEXT PRIMARY KEY,
      from_user_id TEXT NOT NULL,
      to_user_id   TEXT NOT NULL,
      expires_at   TEXT,
      created_at   TEXT DEFAULT (datetime('now')),
      UNIQUE(from_user_id, to_user_id),
      FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (to_user_id)   REFERENCES users(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS conversations (
      id              TEXT PRIMARY KEY,
      user1_id        TEXT NOT NULL,
      user2_id        TEXT NOT NULL,
      last_message_at TEXT,
      created_at      TEXT DEFAULT (datetime('now')),
      UNIQUE(user1_id, user2_id),
      FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS messages (
      id              TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id       TEXT NOT NULL,
      content         TEXT NOT NULL,
      msg_type        TEXT DEFAULT 'text',
      is_read         INTEGER DEFAULT 0,
      created_at      TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id)       REFERENCES users(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS blocks (
      id         TEXT PRIMARY KEY,
      blocker_id TEXT NOT NULL,
      blocked_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(blocker_id, blocked_id),
      FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS reports (
      id          TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL,
      reported_id TEXT NOT NULL,
      category    TEXT NOT NULL,
      description TEXT,
      created_at  TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reported_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS refresh_tokens (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      token      TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  ];

  for (const stmt of statements) {
    sqlDb.run(stmt);
  }

  // Persist initial schema
  dbWrapper._save();

  console.log('✅ Database initialized at', DB_PATH);
  return dbWrapper;
}

function getDB() {
  if (!dbWrapper) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return dbWrapper;
}

module.exports = { initDB, getDB };

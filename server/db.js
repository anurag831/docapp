const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Support custom DB_PATH, auto-detect Railway persistent volume at /data, or default to local data.db
let defaultDbPath = path.resolve(__dirname, '../data.db');
if (process.platform !== 'win32' && fs.existsSync('/data')) {
  defaultDbPath = '/data/data.db';
}
const dbPath = process.env.DB_PATH || defaultDbPath;

// Ensure target directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

db.pragma('foreign_keys = ON');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT 'Untitled',
      content TEXT NOT NULL DEFAULT '',
      owner_id INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      shared_with INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'editor',
      UNIQUE(document_id, shared_with)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      selected_text TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS document_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      label TEXT DEFAULT 'Auto-save checkpoint',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Migrate existing shares table if role column doesn't exist
  const sharesInfo = db.prepare("PRAGMA table_info(shares)").all();
  const hasRoleColumn = sharesInfo.some(col => col.name === 'role');
  if (!hasRoleColumn) {
    db.exec("ALTER TABLE shares ADD COLUMN role TEXT DEFAULT 'editor';");
  }

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, name, email) VALUES (?, ?, ?)
  `);

  insertUser.run(1, 'Alice', 'alice@demo.com');
  insertUser.run(2, 'Bob', 'bob@demo.com');
  insertUser.run(3, 'Carol', 'carol@demo.com');
}

initDb();

module.exports = db;
module.exports.initDb = initDb;

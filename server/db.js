const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.resolve(__dirname, '../data.db');
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
      UNIQUE(document_id, shared_with)
    );
  `);

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

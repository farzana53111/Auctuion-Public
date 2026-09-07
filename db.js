// db.js
// SQLite database setup using better-sqlite3 (a synchronous, file-based DB).
// This is intentionally simple so the whole app runs with zero external
// services. For production at real scale, swap this file for a Postgres
// connection (e.g. using the "pg" package) — the rest of the app only
// talks to the functions exported here, so that's the only file you'd
// need to change.

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'minthouse.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'bidder', -- 'bidder' or 'admin'
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS lots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lot_no TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  grade TEXT,
  description TEXT,
  art_class TEXT DEFAULT 'art-1',
  starting_bid INTEGER NOT NULL,
  current_bid INTEGER NOT NULL,
  min_increment INTEGER NOT NULL DEFAULT 25,
  bid_count INTEGER NOT NULL DEFAULT 0,
  closes_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' or 'closed'
  featured INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS bids (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lot_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(lot_id) REFERENCES lots(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
`);

module.exports = db;

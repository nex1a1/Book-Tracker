import Database from 'better-sqlite3';
import fs from 'fs';
import { config } from './env.js';

if (!fs.existsSync(config.DATA_DIR)) {
  fs.mkdirSync(config.DATA_DIR, { recursive: true });
}

const db = new Database(config.DB_PATH);

// 1. Initial Database Setup
db.exec(`
  CREATE TABLE IF NOT EXISTS authors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS publishers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS series (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT CHECK(type IN ('manga', 'novel', 'light_novel')) DEFAULT 'manga',
    publishYear INTEGER,
    endYear INTEGER DEFAULT NULL,
    status TEXT CHECK(status IN ('ongoing', 'completed', 'hiatus', 'cancelled')) DEFAULT 'ongoing',
    isCollecting INTEGER DEFAULT 1,
    rating REAL DEFAULT 0,
    imageUrl TEXT DEFAULT '',
    notes TEXT,
    author_id INTEGER,
    publisher_id INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES authors(id),
    FOREIGN KEY (publisher_id) REFERENCES publishers(id)
  );

  CREATE TABLE IF NOT EXISTS reading_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    series_id INTEGER NOT NULL,
    title TEXT,
    totalVolumes INTEGER,
    FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reading_ranges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    startVol INTEGER NOT NULL,
    endVol INTEGER NOT NULL,
    FOREIGN KEY (group_id) REFERENCES reading_groups(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS collection_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    series_id INTEGER NOT NULL,
    title TEXT,
    totalVolumes INTEGER,
    FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS collection_ranges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    startVol INTEGER NOT NULL,
    endVol INTEGER NOT NULL,
    FOREIGN KEY (group_id) REFERENCES collection_groups(id) ON DELETE CASCADE
  );

  -- 2. Performance Indexes
  CREATE INDEX IF NOT EXISTS idx_series_title ON series(title);
  CREATE INDEX IF NOT EXISTS idx_series_type_status ON series(type, status);
  CREATE INDEX IF NOT EXISTS idx_series_author_id ON series(author_id);
  CREATE INDEX IF NOT EXISTS idx_series_publisher_id ON series(publisher_id);
`);

// Ensure series table has new columns (Migration support)
try { db.exec("ALTER TABLE series ADD COLUMN author_id INTEGER REFERENCES authors(id)"); } catch (e) {}
try { db.exec("ALTER TABLE series ADD COLUMN publisher_id INTEGER REFERENCES publishers(id)"); } catch (e) {}

export default db;

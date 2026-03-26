// src/index.js (SQLite + JSON Hybrid Version)
import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const dataDir = path.resolve('data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const db = new Database(path.join(dataDir, 'manga.db'));

// ==========================================
// 1. Initial Database Setup
// ==========================================
db.exec(`
  CREATE TABLE IF NOT EXISTS series (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT DEFAULT '',
    publisher TEXT DEFAULT '',
    type TEXT CHECK(type IN ('manga', 'novel', 'light_novel')) DEFAULT 'manga',
    publishYear INTEGER,
    endYear INTEGER DEFAULT NULL,
    status TEXT CHECK(status IN ('ongoing', 'completed', 'hiatus', 'cancelled')) DEFAULT 'ongoing',
    isCollecting INTEGER DEFAULT 1,
    rating REAL DEFAULT 0, -- ✅ เพิ่มโครงสร้าง rating แบบ REAL (ทศนิยม)
    
    -- โครงสร้างใหม่: เก็บ Array ของ Object เป็น JSON String
    readingLogsJSON TEXT DEFAULT '[]', 
    collectionLogsJSON TEXT DEFAULT '[]',
    
    notes TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Migration System (เพิ่ม Column ใหม่ถ้ายังไม่มี)
const migrations = [
  { column: 'readingLogsJSON', type: "TEXT DEFAULT '[]'" },
  { column: 'collectionLogsJSON', type: "TEXT DEFAULT '[]'" },
  { column: 'rating', type: "REAL DEFAULT 0" } // ✅ ดักเผื่อ DB เดิมมีอยู่แล้ว จะได้สร้างคอลัมน์ rating ให้ทันที
];

migrations.forEach(m => {
  try {
    db.prepare(`SELECT ${m.column} FROM series LIMIT 1`).get();
  } catch (e) {
    console.log(`>>> [MIGRATION] Adding ${m.column} column...`);
    db.exec(`ALTER TABLE series ADD COLUMN ${m.column} ${m.type}`);
  }
});

// ==========================================
// 2. Middleware & Helpers
// ==========================================
app.use(cors());
app.use(express.json());

// Helper แปลงข้อมูลจาก DB ให้ Frontend ใช้
const mapSeries = (s) => {
  // Parse JSON ป้องกัน Error กรณีข้อมูลว่าง
  const readingLogs = JSON.parse(s.readingLogsJSON || '[]');
  const collectionLogs = JSON.parse(s.collectionLogsJSON || '[]');

  return {
    ...s,
    _id: s.id.toString(),
    isCollecting: s.isCollecting === 1,
    readingLogs,
    collectionLogs,
    // ลบฟิลด์ JSON ดิบออกก่อนส่งไป Frontend
    readingLogsJSON: undefined, 
    collectionLogsJSON: undefined
  };
};

// Helper คำนวณจำนวนเล่มที่อ่านแล้วจาก Ranges
function calculateReadCount(ranges) {
  const set = new Set();
  if (ranges && Array.isArray(ranges)) {
    ranges.forEach(([start, end]) => {
      for (let i = start; i <= end; i++) set.add(i);
    });
  }
  return set.size;
}

// ==========================================
// 3. API Routes
// ==========================================

app.get('/api/series/stats', (req, res) => {
  try {
    // ดึงข้อมูลทั้งหมดมาคำนวณใน JS แทน (เพราะข้อมูลซับซ้อนขึ้นจากการใช้ JSON)
    const allSeries = db.prepare(`SELECT type, status, isCollecting, readingLogsJSON FROM series`).all();
    
    let totalSeries = 0;
    let collecting = 0;
    let totalRead = 0;
    const typeCount = {};
    const statusCount = {};

    allSeries.forEach(s => {
      totalSeries++;
      if (s.isCollecting) collecting++;
      
      typeCount[s.type] = (typeCount[s.type] || 0) + 1;
      statusCount[s.status] = (statusCount[s.status] || 0) + 1;

      // คำนวณจำนวนเล่มที่อ่านแล้วจาก readingLogsJSON
      const rLogs = JSON.parse(s.readingLogsJSON || '[]');
      rLogs.forEach(log => {
        totalRead += calculateReadCount(log.ranges);
      });
    });

    const byType = Object.entries(typeCount).map(([k, v]) => ({ _id: k, count: v }));
    const byStatus = Object.entries(statusCount).map(([k, v]) => ({ _id: k, count: v }));

    res.json({ 
      byType, 
      byStatus, 
      totals: { totalSeries, collecting, totalRead } 
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/series', (req, res) => {
  try {
    const { page = 1, limit = 24, type, status, isCollecting, search, sortBy = 'updatedAt', sortOrder = 'DESC' } = req.query;
    let baseQuery = "FROM series WHERE 1=1";
    const params = [];
    
    if (type) { baseQuery += " AND type = ?"; params.push(type); }
    if (status) { baseQuery += " AND status = ?"; params.push(status); }
    if (isCollecting !== undefined && isCollecting !== '') { 
      baseQuery += " AND isCollecting = ?"; params.push(isCollecting === 'true' ? 1 : 0); 
    }
    if (search) {
      baseQuery += " AND (title LIKE ? OR author LIKE ? OR publisher LIKE ?)";
      const s = `%${search}%`; params.push(s, s, s);
    }
    
    const total = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...params).count;
    const limitNum = Number(limit);
    const offset = (Number(page) - 1) * limitNum;
    
    const allowedSortFields = ['updatedAt', 'title', 'publishYear', 'rating']; // ✅ อนุญาตให้ Sort ด้วย rating ได้
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'updatedAt';
    const finalSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    
    const rows = db.prepare(`SELECT * ${baseQuery} ORDER BY ${finalSortBy} ${finalSortOrder} LIMIT ? OFFSET ?`).all(...params, limitNum, offset);
    
    res.json({ 
      data: rows.map(mapSeries), 
      pagination: { total, page: Number(page), pages: Math.ceil(total / limitNum) } 
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/series', (req, res) => {
  try {
    const b = req.body;
    const info = db.prepare(`
      INSERT INTO series (
        title, author, publisher, type, publishYear, endYear, status, 
        isCollecting, rating, readingLogsJSON, collectionLogsJSON, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      b.title, b.author || '', b.publisher || '', b.type || 'manga', 
      b.publishYear || null, b.endYear || null, b.status || 'ongoing', 
      b.isCollecting ? 1 : 0, 
      b.rating ? Number(b.rating) : 0, // ✅ บันทึก rating ตอนสร้างเรื่องใหม่
      JSON.stringify(b.readingLogs || []), 
      JSON.stringify(b.collectionLogs || []), 
      b.notes || ''
    );
    const newRow = db.prepare("SELECT * FROM series WHERE id = ?").get(info.lastInsertRowid);
    res.status(201).json(mapSeries(newRow));
  } catch (error) { res.status(400).json({ error: error.message }); }
});

app.patch('/api/series/:id', (req, res) => {
  try {
    const data = { ...req.body };
    const id = req.params.id;
    
    // แปลง Array จาก Frontend กลับเป็น JSON String ก่อนเซฟลง DB
    if (data.readingLogs) { data.readingLogsJSON = JSON.stringify(data.readingLogs); delete data.readingLogs; }
    if (data.collectionLogs) { data.collectionLogsJSON = JSON.stringify(data.collectionLogs); delete data.collectionLogs; }
    
    if (data.isCollecting !== undefined) data.isCollecting = data.isCollecting ? 1 : 0;
    if (data.rating !== undefined) data.rating = Number(data.rating); // ✅ แปลงคะแนนให้เป็นตัวเลขทศนิยมที่ถูกต้อง
    if (data.status === 'completed') data.endYear = (data.endYear && data.endYear !== "") ? Number(data.endYear) : null;
    else data.endYear = null;

    const fields = [];
    const params = [];
    const allowedFields = ['title', 'author', 'publisher', 'type', 'publishYear', 'endYear', 'status', 'isCollecting', 'rating', 'readingLogsJSON', 'collectionLogsJSON', 'notes']; // ✅ เพิ่ม 'rating' ในลิสต์ที่อนุญาตให้อัปเดต
    
    Object.keys(data).forEach(key => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        params.push(data[key]);
      }
    });

    fields.push("updatedAt = CURRENT_TIMESTAMP");
    params.push(id);

    const sql = `UPDATE series SET ${fields.join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...params);
    
    res.json(mapSeries(db.prepare("SELECT * FROM series WHERE id = ?").get(id)));
  } catch (error) {
    console.error("PATCH ERROR:", error.message);
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/series/:id', (req, res) => {
  try { db.prepare("DELETE FROM series WHERE id = ?").run(req.params.id); res.json({ message: 'Deleted' }); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

app.listen(PORT, () => { console.log(`🚀 SQL Server running on http://localhost:${PORT}`); });
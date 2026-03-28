// src/index.js
import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 🔑 เอา Client ID ของ MyAnimeList มาใส่ตรงนี้เลยครับ!
const MAL_CLIENT_ID = 'c46d973094ed01130b93efd3a0015ab4'; 

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
    rating REAL DEFAULT 0,
    imageUrl TEXT DEFAULT '', -- ✅ เพิ่มช่องเก็บลิงก์รูปหน้าปก
    readingLogsJSON TEXT DEFAULT '[]', 
    collectionLogsJSON TEXT DEFAULT '[]',
    notes TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const migrations = [
  { column: 'readingLogsJSON', type: "TEXT DEFAULT '[]'" },
  { column: 'collectionLogsJSON', type: "TEXT DEFAULT '[]'" },
  { column: 'rating', type: "REAL DEFAULT 0" },
  { column: 'imageUrl', type: "TEXT DEFAULT ''" } // ✅ Migration สำหรับรูปปก
];

migrations.forEach(m => {
  try {
    db.prepare(`SELECT ${m.column} FROM series LIMIT 1`).get();
  } catch (e) {
    db.exec(`ALTER TABLE series ADD COLUMN ${m.column} ${m.type}`);
  }
});

// ==========================================
// 2. Middleware & Helpers
// ==========================================
app.use(cors());
app.use(express.json());

const mapSeries = (s) => {
  const readingLogs = JSON.parse(s.readingLogsJSON || '[]');
  const collectionLogs = JSON.parse(s.collectionLogsJSON || '[]');
  return { ...s, _id: s.id.toString(), isCollecting: s.isCollecting === 1, readingLogs, collectionLogs, readingLogsJSON: undefined, collectionLogsJSON: undefined };
};

function calculateReadCount(ranges) {
  const set = new Set();
  if (ranges && Array.isArray(ranges)) ranges.forEach(([start, end]) => { for (let i = start; i <= end; i++) set.add(i); });
  return set.size;
}

// ==========================================
// 3. API Routes
// ==========================================

// ✅ ทางลัดสำหรับให้ Frontend สั่ง Backend ไปคุยกับ MyAnimeList
app.get('/api/mal/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'กรุณาส่งคำค้นหามาด้วย (q)' });
    
    console.log(`[MAL API] 🔍 กำลังค้นหาเรื่อง: ${q}`);

    const response = await fetch(`https://api.myanimelist.net/v2/manga?q=${encodeURIComponent(q)}&limit=5&fields=authors{first_name,last_name},num_volumes,start_date,end_date,status`, {
      headers: { 'X-MAL-CLIENT-ID': MAL_CLIENT_ID }
    });
    
    const data = await response.json();

    if (!response.ok) {
      console.error(`[MAL API] ❌ Error จาก MAL:`, data);
      return res.status(response.status).json(data);
    }

    console.log(`[MAL API] ✅ ดึงข้อมูลสำเร็จ พบ ${data.data?.length || 0} เรื่อง`);
    res.json(data);

  } catch (error) {
    console.error("[Backend Error] 💥 พังตอนดึงข้อมูล MAL:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/series/stats', (req, res) => {
  try {
    const allSeries = db.prepare(`SELECT type, status, isCollecting, readingLogsJSON FROM series`).all();
    let totalSeries = 0, collecting = 0, totalRead = 0;
    const typeCount = {}, statusCount = {};

    allSeries.forEach(s => {
      totalSeries++;
      if (s.isCollecting) collecting++;
      typeCount[s.type] = (typeCount[s.type] || 0) + 1;
      statusCount[s.status] = (statusCount[s.status] || 0) + 1;
      const rLogs = JSON.parse(s.readingLogsJSON || '[]');
      rLogs.forEach(log => { totalRead += calculateReadCount(log.ranges); });
    });

    res.json({ 
      byType: Object.entries(typeCount).map(([k, v]) => ({ _id: k, count: v })), 
      byStatus: Object.entries(statusCount).map(([k, v]) => ({ _id: k, count: v })), 
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
    if (isCollecting !== undefined && isCollecting !== '') { baseQuery += " AND isCollecting = ?"; params.push(isCollecting === 'true' ? 1 : 0); }
    if (search) { baseQuery += " AND (title LIKE ? OR author LIKE ? OR publisher LIKE ?)"; const s = `%${search}%`; params.push(s, s, s); }
    
    const total = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...params).count;
    const limitNum = Number(limit), offset = (Number(page) - 1) * limitNum;
    
    const allowedSortFields = ['updatedAt', 'title', 'publishYear', 'rating'];
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'updatedAt';
    const finalSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    
    const rows = db.prepare(`SELECT * ${baseQuery} ORDER BY ${finalSortBy} ${finalSortOrder} LIMIT ? OFFSET ?`).all(...params, limitNum, offset);
    res.json({ data: rows.map(mapSeries), pagination: { total, page: Number(page), pages: Math.ceil(total / limitNum) } });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/series', (req, res) => {
  try {
    const b = req.body;
    const info = db.prepare(`
      INSERT INTO series (
        title, author, publisher, type, publishYear, endYear, status, 
        isCollecting, rating, imageUrl, readingLogsJSON, collectionLogsJSON, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      b.title, b.author || '', b.publisher || '', b.type || 'manga', 
      b.publishYear || null, b.endYear || null, b.status || 'ongoing', 
      b.isCollecting ? 1 : 0, b.rating ? Number(b.rating) : 0, 
      b.imageUrl || '', // ✅ เซฟรูปปกตอนสร้างใหม่
      JSON.stringify(b.readingLogs || []), JSON.stringify(b.collectionLogs || []), b.notes || ''
    );
    res.status(201).json(mapSeries(db.prepare("SELECT * FROM series WHERE id = ?").get(info.lastInsertRowid)));
  } catch (error) { res.status(400).json({ error: error.message }); }
});

app.patch('/api/series/:id', (req, res) => {
  try {
    const data = { ...req.body }, id = req.params.id;
    if (data.readingLogs) { data.readingLogsJSON = JSON.stringify(data.readingLogs); delete data.readingLogs; }
    if (data.collectionLogs) { data.collectionLogsJSON = JSON.stringify(data.collectionLogs); delete data.collectionLogs; }
    if (data.isCollecting !== undefined) data.isCollecting = data.isCollecting ? 1 : 0;
    if (data.rating !== undefined) data.rating = Number(data.rating);
    if (data.status === 'completed') data.endYear = (data.endYear && data.endYear !== "") ? Number(data.endYear) : null; else data.endYear = null;

    const fields = [], params = [];
    const allowedFields = ['title', 'author', 'publisher', 'type', 'publishYear', 'endYear', 'status', 'isCollecting', 'rating', 'imageUrl', 'readingLogsJSON', 'collectionLogsJSON', 'notes']; // ✅ เพิ่ม imageUrl ให้แก้ไขได้
    
    Object.keys(data).forEach(key => { if (allowedFields.includes(key)) { fields.push(`${key} = ?`); params.push(data[key]); } });
    fields.push("updatedAt = CURRENT_TIMESTAMP"); params.push(id);

    db.prepare(`UPDATE series SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    res.json(mapSeries(db.prepare("SELECT * FROM series WHERE id = ?").get(id)));
  } catch (error) { res.status(400).json({ error: error.message }); }
});

app.delete('/api/series/:id', (req, res) => {
  try { db.prepare("DELETE FROM series WHERE id = ?").run(req.params.id); res.json({ message: 'Deleted' }); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

app.listen(PORT, () => { console.log(`🚀 SQL Server running on http://localhost:${PORT}`); });
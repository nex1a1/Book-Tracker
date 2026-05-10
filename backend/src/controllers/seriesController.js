import db from '../config/db.js';
import { mapSeries, mergeRanges } from '../utils/mapper.js';

export const getSeries = (req, res) => {
  try {
    const { page = 1, limit = 24, type, status, isCollecting, search, sortBy = 'updatedAt', sortOrder = 'DESC' } = req.query;
    let baseQuery = `
      FROM series s
      LEFT JOIN authors a ON s.author_id = a.id
      LEFT JOIN publishers p ON s.publisher_id = p.id
      WHERE 1=1
    `;
    const params = [];
    
    if (type) { baseQuery += " AND s.type = ?"; params.push(type); }
    if (status) { baseQuery += " AND s.status = ?"; params.push(status); }
    if (isCollecting !== undefined && isCollecting !== '') { baseQuery += " AND s.isCollecting = ?"; params.push(isCollecting === 'true' ? 1 : 0); }
    if (search) { 
      baseQuery += " AND (s.title LIKE ? OR a.name LIKE ? OR p.name LIKE ?)"; 
      const s = `%${search}%`; params.push(s, s, s); 
    }
    
    const totalResult = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...params);
    const total = totalResult ? totalResult.count : 0;
    const limitNum = Number(limit), offset = (Number(page) - 1) * limitNum;
    
    const allowedSortFields = {
      updatedAt: 's.updatedAt',
      title: 's.title',
      publishYear: 's.publishYear',
      rating: 's.rating'
    };
    const finalSortBy = allowedSortFields[sortBy] || 's.updatedAt';
    const finalSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    
    const rows = db.prepare(`
      SELECT s.*, a.name as author_name, p.name as publisher_name 
      ${baseQuery} 
      ORDER BY ${finalSortBy} ${finalSortOrder} 
      LIMIT ? OFFSET ?
    `).all(...params, limitNum, offset);

    res.json({ 
      data: rows.map(mapSeries).filter(s => s !== null), 
      pagination: { total, page: Number(page), pages: Math.ceil(total / limitNum) } 
    });
  } catch (error) { 
    console.error("[getSeries] Error:", error);
    res.status(500).json({ error: error.message }); 
  }
};

export const getStats = (req, res) => {
  try {
    const allSeries = db.prepare(`SELECT type, status, isCollecting, id FROM series`).all();
    let totalSeries = 0, collecting = 0, totalRead = 0;
    const typeCount = {}, statusCount = {};

    allSeries.forEach(s => {
      totalSeries++;
      if (s.isCollecting) collecting++;
      typeCount[s.type] = (typeCount[s.type] || 0) + 1;
      statusCount[s.status] = (statusCount[s.status] || 0) + 1;
    });

    const readStats = db.prepare(`
      SELECT SUM(endVol - startVol + 1) as total 
      FROM reading_ranges
    `).get();
    totalRead = readStats.total || 0;

    res.json({ 
      byType: Object.entries(typeCount).map(([k, v]) => ({ _id: k, count: v })), 
      byStatus: Object.entries(statusCount).map(([k, v]) => ({ _id: k, count: v })), 
      totals: { totalSeries, collecting, totalRead } 
    });
  } catch (error) { 
    console.error("[getStats] Error:", error);
    res.status(500).json({ error: error.message }); 
  }
};

export const createSeries = (req, res) => {
  try {
    const b = req.body;
    let seriesId;

    db.transaction(() => {
      let authorId = null;
      if (b.author) {
        db.prepare("INSERT OR IGNORE INTO authors (name) VALUES (?)").run(b.author);
        authorId = db.prepare("SELECT id FROM authors WHERE name = ?").get(b.author).id;
      }

      let publisherId = null;
      if (b.publisher) {
        db.prepare("INSERT OR IGNORE INTO publishers (name) VALUES (?)").run(b.publisher);
        publisherId = db.prepare("SELECT id FROM publishers WHERE name = ?").get(b.publisher).id;
      }

      const info = db.prepare(`
        INSERT INTO series (
          title, type, publishYear, endYear, status, 
          isCollecting, rating, imageUrl, notes, author_id, publisher_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        b.title, b.type || 'manga', b.publishYear || null, b.endYear || null, 
        b.status || 'ongoing', b.isCollecting ? 1 : 0, b.rating ? Number(b.rating) : 0, 
        b.imageUrl || '', b.notes || '', authorId, publisherId
      );
      seriesId = info.lastInsertRowid;

      // 4. Insert Reading Logs
      (b.readingLogs || []).forEach(log => {
        const rInfo = db.prepare("INSERT INTO reading_groups (series_id, title, totalVolumes) VALUES (?, ?, ?)")
          .run(seriesId, log.title, log.totalVolumes || null);
        const groupId = rInfo.lastInsertRowid;

        // ✅ Merge overlapping ranges before saving
        const merged = mergeRanges(log.ranges || []);
        merged.forEach(([start, end]) => {
          db.prepare("INSERT INTO reading_ranges (group_id, startVol, endVol) VALUES (?, ?, ?)").run(groupId, start, end);
        });
      });

      // 5. Insert Collection Logs
      (b.collectionLogs || []).forEach(log => {
        const cInfo = db.prepare("INSERT INTO collection_groups (series_id, title, totalVolumes) VALUES (?, ?, ?)")
          .run(seriesId, log.title, log.totalVolumes || null);
        const groupId = cInfo.lastInsertRowid;

        // ✅ Merge overlapping ranges before saving
        const merged = mergeRanges(log.ranges || []);
        merged.forEach(([start, end]) => {
          db.prepare("INSERT INTO collection_ranges (group_id, startVol, endVol) VALUES (?, ?, ?)").run(groupId, start, end);
        });
      });
    })();

    const result = db.prepare(`
      SELECT s.*, a.name as author_name, p.name as publisher_name 
      FROM series s
      LEFT JOIN authors a ON s.author_id = a.id
      LEFT JOIN publishers p ON s.publisher_id = p.id
      WHERE s.id = ?
    `).get(seriesId);

    res.status(201).json(mapSeries(result));
  } catch (error) { 
    console.error("[createSeries] Error:", error);
    res.status(400).json({ error: error.message }); 
  }
};

export const updateSeries = (req, res) => {
  try {
    const b = { ...req.body }, id = req.params.id;

    db.transaction(() => {
      if (b.author !== undefined) {
        let authorId = null;
        if (b.author) {
          db.prepare("INSERT OR IGNORE INTO authors (name) VALUES (?)").run(b.author);
          authorId = db.prepare("SELECT id FROM authors WHERE name = ?").get(b.author).id;
        }
        db.prepare("UPDATE series SET author_id = ? WHERE id = ?").run(authorId, id);
      }

      if (b.publisher !== undefined) {
        let publisherId = null;
        if (b.publisher) {
          db.prepare("INSERT OR IGNORE INTO publishers (name) VALUES (?)").run(b.publisher);
          publisherId = db.prepare("SELECT id FROM publishers WHERE name = ?").get(b.publisher).id;
        }
        db.prepare("UPDATE series SET publisher_id = ? WHERE id = ?").run(publisherId, id);
      }

      if (b.readingLogs) {
        db.prepare("DELETE FROM reading_groups WHERE series_id = ?").run(id);
        b.readingLogs.forEach(log => {
          const rInfo = db.prepare("INSERT INTO reading_groups (series_id, title, totalVolumes) VALUES (?, ?, ?)")
            .run(id, log.title, log.totalVolumes || null);
          const groupId = rInfo.lastInsertRowid;
          
          // ✅ Merge overlapping ranges before saving
          const merged = mergeRanges(log.ranges || []);
          merged.forEach(([start, end]) => {
            db.prepare("INSERT INTO reading_ranges (group_id, startVol, endVol) VALUES (?, ?, ?)").run(groupId, start, end);
          });
        });
      }

      if (b.collectionLogs) {
        db.prepare("DELETE FROM collection_groups WHERE series_id = ?").run(id);
        b.collectionLogs.forEach(log => {
          const cInfo = db.prepare("INSERT INTO collection_groups (series_id, title, totalVolumes) VALUES (?, ?, ?)")
            .run(id, log.title, log.totalVolumes || null);
          const groupId = cInfo.lastInsertRowid;
          
          // ✅ Merge overlapping ranges before saving
          const merged = mergeRanges(log.ranges || []);
          merged.forEach(([start, end]) => {
            db.prepare("INSERT INTO collection_ranges (group_id, startVol, endVol) VALUES (?, ?, ?)").run(groupId, start, end);
          });
        });
      }

      const data = { ...b };
      if (data.isCollecting !== undefined) data.isCollecting = data.isCollecting ? 1 : 0;
      if (data.rating !== undefined) data.rating = Number(data.rating);
      if (data.status === 'completed') data.endYear = (data.endYear && data.endYear !== "") ? Number(data.endYear) : null; 
      else if (data.status) data.endYear = null;

      const fields = [], params = [];
      const allowedFields = ['title', 'type', 'publishYear', 'endYear', 'status', 'isCollecting', 'rating', 'imageUrl', 'notes'];
      
      Object.keys(data).forEach(key => { if (allowedFields.includes(key)) { fields.push(`${key} = ?`); params.push(data[key]); } });
      
      if (fields.length > 0) {
        fields.push("updatedAt = CURRENT_TIMESTAMP"); params.push(id);
        db.prepare(`UPDATE series SET ${fields.join(', ')} WHERE id = ?`).run(...params);
      }
    })();

    const result = db.prepare(`
      SELECT s.*, a.name as author_name, p.name as publisher_name 
      FROM series s
      LEFT JOIN authors a ON s.author_id = a.id
      LEFT JOIN publishers p ON s.publisher_id = p.id
      WHERE s.id = ?
    `).get(id);

    res.json(mapSeries(result));
  } catch (error) { 
    console.error("[updateSeries] Error:", error);
    res.status(400).json({ error: error.message }); 
  }
};

export const deleteSeries = (req, res) => {
  try { 
    db.prepare("DELETE FROM series WHERE id = ?").run(req.params.id); 
    res.json({ message: 'Deleted' }); 
  } catch (error) { 
    console.error("[deleteSeries] Error:", error);
    res.status(500).json({ error: error.message }); 
  }
};

import { Request, Response } from 'express';
import db from '../config/db.js';
import { mapSeries, mergeRanges, DbSeriesRow } from '../utils/mapper.js';
import { CreateSeriesInput, UpdateSeriesInput } from '../utils/validation.js';
import { getErrorMessage } from '../utils/errors.js';

export const getSeries = (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 24, 
      type, 
      status, 
      isCollecting, 
      search, 
      sortBy = 'updatedAt', 
      sortOrder = 'DESC' 
    } = req.query;
    
    // Robust parsing and sanitization of pagination params
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.max(1, parseInt(limit as string) || 24);
    const offset = (pageNum - 1) * limitNum;

    let baseQuery = `
      FROM series s
      LEFT JOIN authors a ON s.author_id = a.id
      LEFT JOIN publishers p ON s.publisher_id = p.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (type) {
      baseQuery += " AND s.type = ?";
      params.push(type as string);
    }
    if (status) { 
      baseQuery += " AND s.status = ?";
      params.push(status as string);
    }
    
    if (isCollecting !== undefined && isCollecting !== '') {
      baseQuery += " AND s.isCollecting = ?";
      params.push((isCollecting === 'true' || isCollecting === '1') ? 1 : 0);
    }
    
    const trimmedSearch = search ? (search as string).trim() : '';
    if (trimmedSearch) { 
      baseQuery += " AND (s.title LIKE ? OR a.name LIKE ? OR p.name LIKE ?)"; 
      const sVal = `%${trimmedSearch}%`; 
      params.push(sVal, sVal, sVal); 
    }
    
    const totalResult = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...params) as { count: number } | undefined;
    const total = totalResult ? totalResult.count : 0;
    
    const allowedSortFields: Record<string, string> = {
      updatedAt: 's.updatedAt',
      title: 's.title',
      publishYear: 's.publishYear',
      rating: 's.rating'
    };
    const finalSortBy = allowedSortFields[sortBy as string] || 's.updatedAt';
    const finalSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    
    const rows = db.prepare(`
      SELECT s.*, a.name as author_name, p.name as publisher_name 
      ${baseQuery} 
      ORDER BY ${finalSortBy} ${finalSortOrder} 
      LIMIT ? OFFSET ?
    `).all(...params, limitNum, offset) as DbSeriesRow[];

    res.json({ 
      data: rows.map(mapSeries).filter(s => s !== null), 
      pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) } 
    });
  } catch (error) {
    console.error("[getSeries] Error:", error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const getStats = (req: Request, res: Response) => {
  try {
    // 1. Optimize totals and collecting calculation
    const totals = db.prepare(`
      SELECT 
        COUNT(*) as totalSeries, 
        SUM(CASE WHEN isCollecting = 1 AND isCollectingStopped = 0 THEN 1 ELSE 0 END) as collecting 
      FROM series
    `).get() as { totalSeries: number; collecting: number } | undefined;
    
    const totalSeries = totals?.totalSeries || 0;
    const collecting = totals?.collecting || 0;

    // 2. Aggregate type count via SQL
    const byTypeRows = db.prepare(`
      SELECT type as _id, COUNT(*) as count 
      FROM series 
      GROUP BY type
    `).all();

    // 3. Aggregate status count via SQL
    const byStatusRows = db.prepare(`
      SELECT status as _id, COUNT(*) as count 
      FROM series 
      GROUP BY status
    `).all();

    // 4. Calculate total read volumes
    const readStats = db.prepare(`
      SELECT SUM(endVol - startVol + 1) as total 
      FROM reading_ranges
    `).get() as { total: number | null } | undefined;
    const totalRead = readStats?.total || 0;

    res.json({ 
      byType: byTypeRows, 
      byStatus: byStatusRows, 
      totals: { totalSeries, collecting, totalRead } 
    });
  } catch (error) {
    console.error("[getStats] Error:", error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const createSeries = (req: Request, res: Response) => {
  try {
    const b = req.body as CreateSeriesInput;
    let seriesId: number | bigint = 0;

    db.transaction(() => {
      let authorId: number | null = null;
      if (b.author) {
        db.prepare("INSERT OR IGNORE INTO authors (name) VALUES (?)").run(b.author);
        const authRow = db.prepare("SELECT id FROM authors WHERE name = ?").get(b.author) as { id: number } | undefined;
        authorId = authRow ? authRow.id : null;
      }

      let publisherId: number | null = null;
      if (b.publisher) {
        db.prepare("INSERT OR IGNORE INTO publishers (name) VALUES (?)").run(b.publisher);
        const pubRow = db.prepare("SELECT id FROM publishers WHERE name = ?").get(b.publisher) as { id: number } | undefined;
        publisherId = pubRow ? pubRow.id : null;
      }

      const info = db.prepare(`
        INSERT INTO series (
          title, type, publishYear, endYear, status, 
          isCollecting, isCollectingStopped, rating, imageUrl, notes, author_id, publisher_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        b.title, b.type || 'manga', b.publishYear || null, b.endYear || null, 
        b.status || 'ongoing', b.isCollecting ? 1 : 0, b.isCollectingStopped ? 1 : 0, b.rating ? Number(b.rating) : 0, 
        b.imageUrl || '', b.notes || '', authorId, publisherId
      );
      seriesId = info.lastInsertRowid;

      // 4. Insert Reading Logs
      (b.readingLogs || []).forEach(log => {
        const rInfo = db.prepare("INSERT INTO reading_groups (series_id, title, totalVolumes) VALUES (?, ?, ?)")
          .run(seriesId, log.title || null, log.totalVolumes || null);
        const groupId = rInfo.lastInsertRowid;

        // ✅ Merge overlapping ranges before saving
        const merged = mergeRanges(log.ranges as [number, number][] || []);
        merged.forEach(([start, end]) => {
          db.prepare("INSERT INTO reading_ranges (group_id, startVol, endVol) VALUES (?, ?, ?)").run(groupId, start, end);
        });
      });

      // 5. Insert Collection Logs
      (b.collectionLogs || []).forEach(log => {
        const cInfo = db.prepare("INSERT INTO collection_groups (series_id, title, totalVolumes) VALUES (?, ?, ?)")
          .run(seriesId, log.title || null, log.totalVolumes || null);
        const groupId = cInfo.lastInsertRowid;

        // ✅ Merge overlapping ranges before saving
        const merged = mergeRanges(log.ranges as [number, number][] || []);
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
    `).get(seriesId) as DbSeriesRow | undefined;

    res.status(201).json(mapSeries(result));
  } catch (error) {
    console.error("[createSeries] Error:", error);
    res.status(400).json({ error: getErrorMessage(error) });
  }
};

export const updateSeries = (req: Request, res: Response) => {
  try {
    const b = { ...req.body } as UpdateSeriesInput;
    const id = req.params.id;

    db.transaction(() => {
      if (b.author !== undefined) {
        let authorId: number | null = null;
        if (b.author) {
          db.prepare("INSERT OR IGNORE INTO authors (name) VALUES (?)").run(b.author);
          const authRow = db.prepare("SELECT id FROM authors WHERE name = ?").get(b.author) as { id: number } | undefined;
          authorId = authRow ? authRow.id : null;
        }
        db.prepare("UPDATE series SET author_id = ? WHERE id = ?").run(authorId, id);
      }

      if (b.publisher !== undefined) {
        let publisherId: number | null = null;
        if (b.publisher) {
          db.prepare("INSERT OR IGNORE INTO publishers (name) VALUES (?)").run(b.publisher);
          const pubRow = db.prepare("SELECT id FROM publishers WHERE name = ?").get(b.publisher) as { id: number } | undefined;
          publisherId = pubRow ? pubRow.id : null;
        }
        db.prepare("UPDATE series SET publisher_id = ? WHERE id = ?").run(publisherId, id);
      }

      if (b.readingLogs) {
        db.prepare("DELETE FROM reading_groups WHERE series_id = ?").run(id);
        b.readingLogs.forEach(log => {
          const rInfo = db.prepare("INSERT INTO reading_groups (series_id, title, totalVolumes) VALUES (?, ?, ?)")
            .run(id, log.title || null, log.totalVolumes || null);
          const groupId = rInfo.lastInsertRowid;
          
          // ✅ Merge overlapping ranges before saving
          const merged = mergeRanges(log.ranges as [number, number][] || []);
          merged.forEach(([start, end]) => {
            db.prepare("INSERT INTO reading_ranges (group_id, startVol, endVol) VALUES (?, ?, ?)").run(groupId, start, end);
          });
        });
      }

      if (b.collectionLogs) {
        db.prepare("DELETE FROM collection_groups WHERE series_id = ?").run(id);
        b.collectionLogs.forEach(log => {
          const cInfo = db.prepare("INSERT INTO collection_groups (series_id, title, totalVolumes) VALUES (?, ?, ?)")
            .run(id, log.title || null, log.totalVolumes || null);
          const groupId = cInfo.lastInsertRowid;
          
          // ✅ Merge overlapping ranges before saving
          const merged = mergeRanges(log.ranges as [number, number][] || []);
          merged.forEach(([start, end]) => {
            db.prepare("INSERT INTO collection_ranges (group_id, startVol, endVol) VALUES (?, ?, ?)").run(groupId, start, end);
          });
        });
      }

      const allowedFields = ['title', 'type', 'publishYear', 'endYear', 'status', 'isCollecting', 'isCollectingStopped', 'rating', 'imageUrl', 'notes'] as const;
      const data: Partial<Record<typeof allowedFields[number], string | number | null>> = {};

      for (const key of allowedFields) {
        const value = b[key];
        if (value === undefined) continue;
        if (key === 'isCollecting' || key === 'isCollectingStopped') data[key] = value ? 1 : 0;
        else if (key === 'rating') data.rating = Number(value);
        else data[key] = value as string | number | null;
      }

      if (data.status === 'completed') data.endYear = (data.endYear && data.endYear !== "") ? Number(data.endYear) : null;
      else if (data.status) data.endYear = null;

      const fields: string[] = [];
      const params: (string | number | null)[] = [];

      (Object.keys(data) as (typeof allowedFields[number])[]).forEach(key => {
        fields.push(`${key} = ?`);
        params.push(data[key] ?? null);
      });
      
      if (fields.length > 0) {
        fields.push("updatedAt = CURRENT_TIMESTAMP"); 
        params.push(id);
        db.prepare(`UPDATE series SET ${fields.join(', ')} WHERE id = ?`).run(...params);
      }
    })();

    const result = db.prepare(`
      SELECT s.*, a.name as author_name, p.name as publisher_name 
      FROM series s
      LEFT JOIN authors a ON s.author_id = a.id
      LEFT JOIN publishers p ON s.publisher_id = p.id
      WHERE s.id = ?
    `).get(id) as DbSeriesRow | undefined;

    res.json(mapSeries(result));
  } catch (error) {
    console.error("[updateSeries] Error:", error);
    res.status(400).json({ error: getErrorMessage(error) });
  }
};

export const deleteSeries = (req: Request, res: Response) => {
  try { 
    db.prepare("DELETE FROM series WHERE id = ?").run(req.params.id); 
    res.json({ message: 'Deleted' }); 
  } catch (error) {
    console.error("[deleteSeries] Error:", error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

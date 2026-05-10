import db from '../config/db.js';

export const migrateData = () => {
  const tableInfo = db.prepare("PRAGMA table_info(series)").all();
  const hasOldLogs = tableInfo.some(c => c.name === 'readingLogsJSON');
  
  if (hasOldLogs) {
    console.log("🚀 Starting Database Migration to Normalized Schema...");
    const oldData = db.prepare("SELECT * FROM series").all();
    
    const insertAuthor = db.prepare("INSERT OR IGNORE INTO authors (name) VALUES (?)");
    const insertPublisher = db.prepare("INSERT OR IGNORE INTO publishers (name) VALUES (?)");
    const getAuthor = db.prepare("SELECT id FROM authors WHERE name = ?");
    const getPublisher = db.prepare("SELECT id FROM publishers WHERE name = ?");
    
    db.transaction(() => {
      for (const row of oldData) {
        let authorId = null;
        if (row.author) {
          insertAuthor.run(row.author);
          authorId = getAuthor.get(row.author)?.id;
        }

        let publisherId = null;
        if (row.publisher) {
          insertPublisher.run(row.publisher);
          publisherId = getPublisher.get(row.publisher)?.id;
        }

        db.prepare("UPDATE series SET author_id = ?, publisher_id = ? WHERE id = ?").run(authorId, publisherId, row.id);

        // Migrate Reading Logs
        const rLogs = JSON.parse(row.readingLogsJSON || '[]');
        rLogs.forEach(log => {
          const info = db.prepare("INSERT INTO reading_groups (series_id, title, totalVolumes) VALUES (?, ?, ?)").run(row.id, log.title, log.totalVolumes || null);
          const groupId = info.lastInsertRowid;
          (log.ranges || []).forEach(([start, end]) => {
            db.prepare("INSERT INTO reading_ranges (group_id, startVol, endVol) VALUES (?, ?, ?)").run(groupId, start, end);
          });
        });

        // Migrate Collection Logs
        const cLogs = JSON.parse(row.collectionLogsJSON || '[]');
        cLogs.forEach(log => {
          const info = db.prepare("INSERT INTO collection_groups (series_id, title, totalVolumes) VALUES (?, ?, ?)").run(row.id, log.title, log.totalVolumes || null);
          const groupId = info.lastInsertRowid;
          (log.ranges || []).forEach(([start, end]) => {
            db.prepare("INSERT INTO collection_ranges (group_id, startVol, endVol) VALUES (?, ?, ?)").run(groupId, start, end);
          });
        });
      }

      // Cleanup old columns
      try {
        db.exec("ALTER TABLE series DROP COLUMN author");
        db.exec("ALTER TABLE series DROP COLUMN publisher");
        db.exec("ALTER TABLE series DROP COLUMN readingLogsJSON");
        db.exec("ALTER TABLE series DROP COLUMN collectionLogsJSON");
      } catch (e) {
        console.warn("⚠️ Could not drop old columns (Legacy SQLite?), ignoring.");
      }
    })();
    console.log("✅ Migration Complete!");
  }
};

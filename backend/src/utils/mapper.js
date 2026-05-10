import db from '../config/db.js';

export const mapSeries = (s) => {
  try {
    if (!s || !s.id) return null;

    // 1. Fetch Reading Groups and their Ranges
    const readingLogs = db.prepare(`
      SELECT id, title, totalVolumes FROM reading_groups WHERE series_id = ?
    `).all(s.id).map(rg => {
      const ranges = db.prepare(`
        SELECT startVol, endVol FROM reading_ranges WHERE group_id = ? ORDER BY startVol ASC
      `).all(rg.id).map(r => [r.startVol, r.endVol]);

      return {
        id: rg.id.toString(),
        title: rg.title || '',
        totalVolumes: rg.totalVolumes,
        ranges
      };
    });

    // 2. Fetch Collection Groups and their Ranges
    const collectionLogs = db.prepare(`
      SELECT id, title, totalVolumes FROM collection_groups WHERE series_id = ?
    `).all(s.id).map(cg => {
      const ranges = db.prepare(`
        SELECT startVol, endVol FROM collection_ranges WHERE group_id = ? ORDER BY startVol ASC
      `).all(cg.id).map(r => [r.startVol, r.endVol]);

      return {
        id: cg.id.toString(),
        title: cg.title || '',
        totalVolumes: cg.totalVolumes,
        ranges
      };
    });

    return { 
      ...s, 
      _id: s.id.toString(), 
      isCollecting: s.isCollecting === 1, 
      author: s.author_name || '',
      publisher: s.publisher_name || '',
      readingLogs, 
      collectionLogs 
    };
  } catch (err) {
    console.error(`[mapper] Critical error mapping series ${s?.id}:`, err);
    throw err;
  }
};

export const calculateReadCount = (ranges) => {
  const set = new Set();
  if (ranges && Array.isArray(ranges)) {
    ranges.forEach(([start, end]) => {
      for (let i = start; i <= end; i++) set.add(i);
    });
  }
  return set.size;
};

/**
 * Merges overlapping or contiguous ranges and sorts them.
 * Example: [[6,12], [1,5], [13,15]] -> [[1,15]]
 */
export const mergeRanges = (ranges) => {
  if (!ranges || ranges.length === 0) return [];

  // Ensure all values are numbers and sort by start volume
  const sorted = [...ranges]
    .map(r => [Number(r[0]), Number(r[1])])
    .sort((a, b) => a[0] - b[0]);
  
  const merged = [];
  let [currentStart, currentEnd] = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const [nextStart, nextEnd] = sorted[i];

    // If next range overlaps or is contiguous (nextStart <= currentEnd + 1)
    if (nextStart <= currentEnd + 1) {
      currentEnd = Math.max(currentEnd, nextEnd);
    } else {
      merged.push([currentStart, currentEnd]);
      [currentStart, currentEnd] = [nextStart, nextEnd];
    }
  }
  
  merged.push([currentStart, currentEnd]);
  
  if (merged.length < ranges.length) {
    console.log(`[mergeRanges] Optimized ranges from ${ranges.length} to ${merged.length}`);
  }
  
  return merged;
};

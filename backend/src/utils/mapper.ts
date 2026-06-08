import db from '../config/db.js';

export interface DbSeriesRow {
  id: number;
  title: string;
  type: 'manga' | 'novel' | 'light_novel';
  publishYear: number | null;
  endYear: number | null;
  status: 'ongoing' | 'completed' | 'hiatus' | 'cancelled';
  isCollecting: number;
  rating: number;
  imageUrl: string;
  notes: string | null;
  author_id: number | null;
  publisher_id: number | null;
  createdAt: string;
  updatedAt: string;
  author_name?: string;
  publisher_name?: string;
}

export interface MappedBookLog {
  id: string;
  title: string;
  totalVolumes: number | null;
  ranges: [number, number][];
}

export interface MappedSeries {
  id: number;
  _id: string;
  title: string;
  type: 'manga' | 'novel' | 'light_novel';
  publishYear: number | null;
  endYear: number | null;
  status: 'ongoing' | 'completed' | 'hiatus' | 'cancelled';
  isCollecting: boolean;
  rating: number;
  imageUrl: string;
  notes: string | null;
  author_id: number | null;
  publisher_id: number | null;
  createdAt: string;
  updatedAt: string;
  author: string;
  publisher: string;
  readingLogs: MappedBookLog[];
  collectionLogs: MappedBookLog[];
}

export const mapSeries = (s: DbSeriesRow | undefined | null): MappedSeries | null => {
  try {
    if (!s || !s.id) return null;

    // 1. Fetch Reading Groups and their Ranges
    const readingLogs: MappedBookLog[] = db.prepare(`
      SELECT id, title, totalVolumes FROM reading_groups WHERE series_id = ?
    `).all(s.id).map((rg: any) => {
      const ranges = db.prepare(`
        SELECT startVol, endVol FROM reading_ranges WHERE group_id = ? ORDER BY startVol ASC
      `).all(rg.id).map((r: any) => [r.startVol, r.endVol] as [number, number]);

      return {
        id: rg.id.toString(),
        title: rg.title || '',
        totalVolumes: rg.totalVolumes,
        ranges
      };
    });

    // 2. Fetch Collection Groups and their Ranges
    const collectionLogs: MappedBookLog[] = db.prepare(`
      SELECT id, title, totalVolumes FROM collection_groups WHERE series_id = ?
    `).all(s.id).map((cg: any) => {
      const ranges = db.prepare(`
        SELECT startVol, endVol FROM collection_ranges WHERE group_id = ? ORDER BY startVol ASC
      `).all(cg.id).map((r: any) => [r.startVol, r.endVol] as [number, number]);

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

export const calculateReadCount = (ranges: [number, number][] | undefined | null): number => {
  const set = new Set<number>();
  if (ranges && Array.isArray(ranges)) {
    ranges.forEach(([start, end]) => {
      for (let i = start; i <= end; i++) set.add(i);
    });
  }
  return set.size;
};

export const mergeRanges = (ranges: [number, number][] | undefined | null): [number, number][] => {
  if (!ranges || ranges.length === 0) return [];

  // Ensure all values are numbers, auto-normalize start/end bounds, and sort by start volume
  const sorted = [...ranges]
    .map(r => {
      const v1 = Number(r[0]);
      const v2 = Number(r[1]);
      return [Math.min(v1, v2), Math.max(v1, v2)] as [number, number];
    })
    .sort((a, b) => a[0] - b[0]);
  
  const merged: [number, number][] = [];
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

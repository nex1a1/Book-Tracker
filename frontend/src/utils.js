export const TYPE_LABEL = { manga: "Manga", novel: "Novel", light_novel: "Light Novel" };
export const STATUS_LABEL = { ongoing: "ยังไม่จบ", completed: "จบแล้ว", hiatus: "หยุดตีพิมพ์ชั่วคราว", cancelled: "โดนตัดจบ" };
export const FORMAT_LABEL = { normal: "เล่มปกติ", bigbook: "Bigbook", pocket: "Pocket Book", digital: "E-Book", omnibus: "Omnibus" };
export const RATING_LABEL = { 0: "—", 1: "★ แย่", 2: "★★ พอใช้", 3: "★★★ ดี", 4: "★★★★ ดีมาก", 5: "★★★★★ ยอดเยี่ยม" };

export function getSetFromRanges(ranges) {
  const set = new Set();
  if (ranges && Array.isArray(ranges)) ranges.forEach(([s, e]) => { for (let i = s; i <= e; i++) set.add(i); });
  return set;
}

/**
 * Merges overlapping or contiguous ranges and sorts them.
 * Example: [[6,12], [1,5]] -> [[1,12]]
 */
export function mergeRanges(ranges) {
  if (!ranges || ranges.length === 0) return [];
  const sorted = [...ranges]
    .map(r => [Number(r[0]), Number(r[1])])
    .sort((a, b) => a[0] - b[0]);
  
  const merged = [];
  let [currentStart, currentEnd] = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const [nextStart, nextEnd] = sorted[i];
    if (nextStart <= currentEnd + 1) {
      currentEnd = Math.max(currentEnd, nextEnd);
    } else {
      merged.push([currentStart, currentEnd]);
      [currentStart, currentEnd] = [nextStart, nextEnd];
    }
  }
  merged.push([currentStart, currentEnd]);
  return merged;
}

export function getMissingVolumesText(ranges, limitVolume) {
  if (!limitVolume || limitVolume <= 0) return "-";
  const boughtSet = getSetFromRanges(ranges);
  const missing = [];
  for (let i = 1; i <= limitVolume; i++) { if (!boughtSet.has(i)) missing.push(i); }
  if (missing.length === 0) return "ครบถ้วน";
  const grouped = [];
  let start = missing[0], end = missing[0];
  for (let i = 1; i < missing.length; i++) {
    if (missing[i] === end + 1) end = missing[i];
    else { grouped.push(start === end ? `${start}` : `${start}-${end}`); start = missing[i]; end = missing[i]; }
  }
  grouped.push(start === end ? `${start}` : `${start}-${end}`);
  return grouped.join(", ");
}

export function normalizeSeriesData(series) {
  if (!series) return null;
  const n = { ...series };
  if (!n.readingLogs || n.readingLogs.length === 0) {
    n.readingLogs = [{ id: 'm1', title: 'ภาคหลัก', totalVolumes: series.totalVolumes || 0, ranges: series.readRanges || [] }];
  }
  if (!n.collectionLogs || n.collectionLogs.length === 0) {
    n.collectionLogs = [{ id: 'c1', format: series.boughtFormat || 'normal', title: 'เล่มปกติ', totalVolumes: series.thaiLatestVolume || 0, ranges: series.boughtRanges || [] }];
  }
  return n;
}

export function getSeriesDerivedStats(series) {
  const n = normalizeSeriesData(series);
  const totalReadJP = n.readingLogs.reduce((sum, log) => sum + (Number(log.totalVolumes) || 0), 0);
  const totalReadCount = n.readingLogs.reduce((sum, log) => sum + getSetFromRanges(log.ranges).size, 0);
  const isAllRead = totalReadCount >= totalReadJP && totalReadJP > 0;
  const isFinishedReading = n.status === 'completed' && isAllRead;
  const isCaughtUp = n.status !== 'completed' && isAllRead;
  const isReading = totalReadCount > 0 && !isAllRead;
  const isUnread = totalReadCount === 0;
  let isCollectMissing = false, isCollectComplete = false;
  const isNotCollecting = !n.isCollecting;
  if (n.isCollecting) {
    const hasMissing = n.collectionLogs.some(log => getMissingVolumesText(log.ranges, log.totalVolumes) !== 'ครบถ้วน');
    isCollectMissing = hasMissing;
    isCollectComplete = !hasMissing;
  }
  return { n, totalReadJP, totalReadCount, isAllRead, isFinishedReading, isCaughtUp, isReading, isUnread, isCollectMissing, isCollectComplete, isNotCollecting };
}
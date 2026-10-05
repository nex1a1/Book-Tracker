import { VolumeRange, Series, SeriesDerivedStats, BookLog } from "../types";
import { FORMAT_LABEL, LANGUAGE_SHORT } from "./constants";

export function getSetFromRanges(ranges: VolumeRange[] | undefined | null): Set<number> {
  const set = new Set<number>();
  if (ranges && Array.isArray(ranges)) {
    ranges.forEach(([s, e]) => {
      for (let i = s; i <= e; i++) {
        set.add(i);
      }
    });
  }
  return set;
}

/**
 * Merges overlapping or contiguous ranges and sorts them.
 * Example: [[6,12], [1,5]] -> [[1,12]]
 */
export function mergeRanges(ranges: VolumeRange[] | undefined | null): VolumeRange[] {
  if (!ranges || ranges.length === 0) return [];
  const sorted = [...ranges]
    .map(r => {
      const v1 = Number(r[0]);
      const v2 = Number(r[1]);
      return [Math.min(v1, v2), Math.max(v1, v2)] as VolumeRange;
    })
    .sort((a, b) => a[0] - b[0]);
  
  const merged: VolumeRange[] = [];
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

/**
 * Formats VolumeRange array to human readable range string (e.g. [[1, 20], [21, 21]] -> "1-20, 21")
 */
export function formatVolumeRangesString(ranges: VolumeRange[] | undefined | null): string {
  if (!ranges || ranges.length === 0) return 'ไม่มี';
  return ranges.map(([s, e]) => s === e ? `${s}` : `${s}-${e}`).join(', ');
}

/** Collection logs without a language predate the field and are Thai editions. */
export function getLogLanguage(log: BookLog) {
  return log.language ?? 'th';
}

/** Collection log name for display; non-Thai logs get a language tag, e.g. "JP · ปกพิเศษ". */
export function getCollectionLogLabel(log: BookLog): string {
  const lang = getLogLanguage(log);
  const name = log.title || FORMAT_LABEL[log.format || 'normal'];
  return lang === 'th' ? name : `${LANGUAGE_SHORT[lang]} · ${name}`;
}

export function getMissingVolumesText(ranges: VolumeRange[] | undefined | null, limitVolume: number | null | undefined): string {
  if (!limitVolume || limitVolume <= 0) return "-";
  const boughtSet = getSetFromRanges(ranges);
  const missing: number[] = [];
  for (let i = 1; i <= limitVolume; i++) {
    if (!boughtSet.has(i)) missing.push(i);
  }
  if (missing.length === 0) return "ครบถ้วน";
  const grouped: string[] = [];
  let start = missing[0], end = missing[0];
  for (let i = 1; i < missing.length; i++) {
    if (missing[i] === end + 1) {
      end = missing[i];
    } else {
      grouped.push(start === end ? `${start}` : `${start}-${end}`);
      start = missing[i];
      end = missing[i];
    }
  }
  grouped.push(start === end ? `${start}` : `${start}-${end}`);
  return grouped.join(", ");
}

/** How one collection log stands. "Keep some volumes" logs and logs with no total yet can't be judged. */
export function getLogState(log: BookLog): 'partial' | 'unknown' | 'complete' | 'missing' {
  if (log.isPartial) return 'partial';
  const text = getMissingVolumesText(log.ranges, log.totalVolumes);
  return text === '-' ? 'unknown' : text === 'ครบถ้วน' ? 'complete' : 'missing';
}

export function normalizeSeriesData(series: Series | null | undefined): Series | null {
  if (!series) return null;
  const n = { ...series, isCollectingStopped: Boolean(series.isCollectingStopped) };
  if (!n.readingLogs || n.readingLogs.length === 0) {
    n.readingLogs = [
      {
        id: 'm1',
        title: 'ภาคหลัก',
        totalVolumes: series.totalVolumes ?? null,
        ranges: series.readRanges || []
      }
    ];
  }
  if (!n.collectionLogs || n.collectionLogs.length === 0) {
    n.collectionLogs = [
      {
        id: 'c1',
        format: series.boughtFormat || 'normal',
        title: 'เล่มปกติ',
        totalVolumes: series.thaiLatestVolume ?? null,
        ranges: series.boughtRanges || []
      }
    ];
  }
  return n;
}

export function getSeriesDerivedStats(series: Series): SeriesDerivedStats {
  const n = normalizeSeriesData(series)!;
  const totalReadJP = n.readingLogs.reduce((sum, log) => sum + (Number(log.totalVolumes) || 0), 0);
  const totalReadCount = n.readingLogs.reduce((sum, log) => sum + getSetFromRanges(log.ranges).size, 0);
  const isAllRead = totalReadCount >= totalReadJP && totalReadJP > 0;
  const isFinishedReading = n.status === 'completed' && isAllRead;
  const isCaughtUp = n.status !== 'completed' && isAllRead;
  const isReading = totalReadCount > 0 && !isAllRead;
  const isUnread = totalReadCount === 0;
  
  let isCollectMissing = false;
  let isCollectComplete = false;
  const isCollectStopped = n.isCollecting && Boolean(n.isCollectingStopped);
  const isNotCollecting = !n.isCollecting;
  
  if (n.isCollecting) {
    // Logs that can't be judged never count as missing (the checklist skips them too), and a series with
    // nothing judgeable is neither missing nor complete.
    const states = n.collectionLogs.map(getLogState);
    const hasMissing = states.includes('missing');
    isCollectMissing = !isCollectStopped && hasMissing;
    isCollectComplete = !hasMissing && states.includes('complete');
  }
  
  return {
    n,
    totalReadJP,
    totalReadCount,
    isAllRead,
    isFinishedReading,
    isCaughtUp,
    isReading,
    isUnread,
    isCollectMissing,
    isCollectComplete,
    isCollectStopped,
    isNotCollecting
  };
}

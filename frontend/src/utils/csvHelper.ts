import { Series, BookLog } from "../types";
import { TYPE_LABEL, STATUS_LABEL, LANGUAGE_SHORT } from "./constants";
import { normalizeSeriesData, getSetFromRanges, countVolumesWithin, formatVolumeRangesString, getCollectionLogLabel, getLogLanguage } from "./helpers";

export type ExportLayoutMode = 'series' | 'split_logs';

export interface CsvColumnOption {
  key: keyof Series | 'publishPeriod' | 'subLogTitle' | 'readProgress' | 'collectionProgress' | 'totalReadCount' | 'totalReadMax' | 'totalOwnedCount' | 'totalOwnedOtherLanguage' | 'collectionLanguage' | 'readRangesDetail' | 'collectionRangesDetail';
  label: string;
  defaultSelected: boolean;
  getValue: (item: Series) => string | number;
}

/**
 * Formats publishing year range (e.g. "2002-2015" or "2015-ปัจจุบัน")
 */
export function formatYearRange(publishYear?: number | null, endYear?: number | null, status?: string): string {
  if (!publishYear && !endYear) return '-';
  if (!publishYear) return `${endYear}`;
  if (endYear) {
    return publishYear === endYear ? `${publishYear}` : `${publishYear}-${endYear}`;
  }
  if (status === 'completed' || status === 'cancelled') {
    return `${publishYear}`;
  }
  return `${publishYear}-ปัจจุบัน`;
}

/**
 * One collection log's progress: "มีแล้ว 3/10 เล่ม", or the owned ranges for "keep only some volumes" logs.
 */
function formatLogProgress(log: BookLog, suffix = ''): string {
  if (log.isPartial) return `เก็บบางเล่ม [${formatVolumeRangesString(log.ranges)}]${suffix}`;
  const ownedCount = countVolumesWithin(log.ranges, log.totalVolumes);
  const totalText = log.totalVolumes && log.totalVolumes > 0 ? `/${log.totalVolumes} เล่ม` : ' เล่ม';
  return `มีแล้ว ${ownedCount}${totalText}${suffix}`;
}

/** One collection log's owned ranges, e.g. "เล่มปกติ: [1-25]". */
function formatLogRanges(log: BookLog): string {
  return `${getCollectionLogLabel(log)}: [${formatVolumeRangesString(log.ranges)}]`;
}

/** Owned volumes split into Thai editions and every other language. */
function countOwnedByLanguage(logs: BookLog[]): { thai: number; other: number } {
  let thai = 0, other = 0;
  logs.forEach(log => {
    const n = getSetFromRanges(log.ranges).size;
    if (getLogLanguage(log) === 'th') thai += n; else other += n;
  });
  return { thai, other };
}

/**
 * Formats collection progress cleanly, returning "ไม่ได้เก็บสะสม" when isCollecting is false
 */
export function formatCollectionProgress(series: Series, logTitle?: string): string {
  if (!series.isCollecting) {
    return 'ไม่ได้เก็บสะสม';
  }
  const normalized = normalizeSeriesData(series);
  if (!normalized || !normalized.collectionLogs || normalized.collectionLogs.length === 0) {
    return 'ยังไม่มีเล่ม';
  }

  const suffix = series.isCollectingStopped ? ' (เลิกตามแล้ว)' : '';
  return normalized.collectionLogs.map(log => {
    const prefix = logTitle ? '' : `${getCollectionLogLabel(log)}: `;
    return `${prefix}${formatLogProgress(log, suffix)}`;
  }).join(' | ');
}

export const CSV_COLUMNS: CsvColumnOption[] = [
  { key: 'id', label: 'ID', defaultSelected: true, getValue: (item) => item.id },
  { key: 'title', label: 'ชื่อเรื่อง', defaultSelected: true, getValue: (item) => item.title || '' },
  { 
    key: 'subLogTitle', 
    label: 'ชื่อภาค / กลุ่มย่อย', 
    defaultSelected: true, 
    getValue: (item) => {
      const normalized = normalizeSeriesData(item);
      if (!normalized || !normalized.readingLogs || normalized.readingLogs.length === 0) return 'ภาคหลัก';
      return normalized.readingLogs.map(l => l.title).join(', ');
    } 
  },
  { key: 'author', label: 'ผู้แต่ง', defaultSelected: true, getValue: (item) => item.author || '' },
  { key: 'publisher', label: 'สำนักพิมพ์', defaultSelected: true, getValue: (item) => item.publisher || '' },
  { key: 'type', label: 'ประเภท', defaultSelected: true, getValue: (item) => TYPE_LABEL[item.type] || item.type },
  { key: 'status', label: 'สถานะการตีพิมพ์', defaultSelected: true, getValue: (item) => STATUS_LABEL[item.status] || item.status },
  { key: 'isCollecting', label: 'สถานะสะสม', defaultSelected: true, getValue: (item) => item.isCollecting ? (item.isCollectingStopped ? 'เลิกตามแล้ว' : 'กำลังสะสม') : 'ไม่ได้เก็บสะสม' },
  { key: 'rating', label: 'คะแนน (0-5)', defaultSelected: true, getValue: (item) => item.rating || 0 },
  { 
    key: 'publishPeriod', 
    label: 'ปีที่ตีพิมพ์', 
    defaultSelected: true, 
    getValue: (item) => formatYearRange(item.publishYear, item.endYear, item.status) 
  },
  {
    key: 'readProgress',
    label: 'ความคืบหน้าการอ่าน',
    defaultSelected: true,
    getValue: (item) => {
      const normalized = normalizeSeriesData(item);
      if (!normalized || !normalized.readingLogs || normalized.readingLogs.length === 0) return 'ยังไม่ได้อ่าน';
      return normalized.readingLogs.map(log => {
        const readCount = countVolumesWithin(log.ranges, log.totalVolumes);
        const total = log.totalVolumes && log.totalVolumes > 0 ? `/${log.totalVolumes} เล่ม` : ' เล่ม';
        return `${log.title}: อ่านแล้ว ${readCount}${total}`;
      }).join(' | ');
    }
  },
  {
    key: 'collectionProgress',
    label: 'เล่มที่มีในครอบครอง',
    defaultSelected: true,
    getValue: (item) => formatCollectionProgress(item)
  },
  {
    key: 'totalReadCount',
    label: 'จำนวนเล่มที่อ่านแล้วรวม',
    defaultSelected: false,
    getValue: (item) => {
      const normalized = normalizeSeriesData(item);
      if (!normalized || !normalized.readingLogs) return 0;
      return normalized.readingLogs.reduce((sum, log) => sum + countVolumesWithin(log.ranges, log.totalVolumes), 0);
    }
  },
  {
    key: 'totalReadMax',
    label: 'จำนวนเล่มทั้งหมดรวม',
    defaultSelected: false,
    getValue: (item) => {
      const normalized = normalizeSeriesData(item);
      if (!normalized || !normalized.readingLogs) return 0;
      return normalized.readingLogs.reduce((sum, log) => sum + (Number(log.totalVolumes) || 0), 0);
    }
  },
  {
    key: 'totalOwnedCount',
    label: 'จำนวนเล่มที่มีรวม (ไทย)',
    defaultSelected: false,
    getValue: (item) => {
      if (!item.isCollecting) return 0;
      const normalized = normalizeSeriesData(item);
      if (!normalized || !normalized.collectionLogs) return 0;
      return countOwnedByLanguage(normalized.collectionLogs).thai;
    }
  },
  {
    key: 'totalOwnedOtherLanguage',
    label: 'จำนวนเล่มต่างภาษาที่มี',
    defaultSelected: false,
    getValue: (item) => {
      if (!item.isCollecting) return 0;
      const normalized = normalizeSeriesData(item);
      if (!normalized || !normalized.collectionLogs) return 0;
      return countOwnedByLanguage(normalized.collectionLogs).other;
    }
  },
  {
    key: 'collectionLanguage',
    label: 'ภาษาของเล่มที่มี',
    defaultSelected: true,
    getValue: (item) => {
      if (!item.isCollecting) return '-';
      const normalized = normalizeSeriesData(item);
      const langs = new Set((normalized?.collectionLogs || []).filter(log => log.ranges.length > 0).map(getLogLanguage));
      return langs.size > 0 ? [...langs].map(l => LANGUAGE_SHORT[l]).join(', ') : '-';
    }
  },
  {
    key: 'readRangesDetail',
    label: 'ช่วงเล่มที่อ่านแล้ว (Ranges)',
    defaultSelected: false,
    getValue: (item) => {
      const normalized = normalizeSeriesData(item);
      if (!normalized || !normalized.readingLogs) return '-';
      return normalized.readingLogs.map(log => `${log.title}: [${formatVolumeRangesString(log.ranges)}]`).join(' | ');
    }
  },
  {
    key: 'collectionRangesDetail',
    label: 'ช่วงเล่มที่มีในครอบครอง (Ranges)',
    defaultSelected: false,
    getValue: (item) => {
      if (!item.isCollecting) return 'ไม่ได้เก็บสะสม';
      const normalized = normalizeSeriesData(item);
      if (!normalized || !normalized.collectionLogs) return '-';
      return normalized.collectionLogs.map(formatLogRanges).join(' | ');
    }
  },
  { key: 'publishYear', label: 'ปีเริ่มตีพิมพ์ (เดี่ยว)', defaultSelected: false, getValue: (item) => item.publishYear || '' },
  { key: 'endYear', label: 'ปีจบตีพิมพ์ (เดี่ยว)', defaultSelected: false, getValue: (item) => item.endYear || '' },
  { key: 'notes', label: 'บันทึกเพิ่มเติม', defaultSelected: false, getValue: (item) => item.notes || '' }
];

/**
 * Escapes a field for CSV format.
 * Surrounds with double quotes if field contains commas, double quotes, or newlines.
 * Escapes internal double quotes by doubling them ("").
 */
// Text a spreadsheet would run as a formula (=, +, @, tab, CR, or "-" followed by anything; a lone "-" is the
// "no value" placeholder) gets a leading ' so Excel/Sheets keep it as text. Titles can come from MAL.
const FORMULA_START = /^([=+@\t\r]|-[\s\S])/;

function escapeCsvValue(val: string | number): string {
  let stringVal = String(val ?? '');
  if (FORMULA_START.test(stringVal)) stringVal = `'${stringVal}`;
  if (stringVal.includes('"') || stringVal.includes(',') || stringVal.includes('\n') || stringVal.includes('\r')) {
    return `"${stringVal.replace(/"/g, '""')}"`;
  }
  return stringVal;
}

/**
 * Generates raw CSV text (without BOM for display, or with BOM for download).
 * Respects exact column order of selectedColumnKeys.
 * Supports both 'series' mode (1 row per series) and 'split_logs' mode (1 row per sub-log).
 */
export function generateCsvData(
  seriesList: Series[],
  selectedColumnKeys: string[],
  includeBom: boolean = false,
  layoutMode: ExportLayoutMode = 'series'
): { csvString: string; headers: string[]; rows: string[][] } {
  // Map columns strictly according to selectedColumnKeys order!
  const colMap = new Map<string, CsvColumnOption>(CSV_COLUMNS.map(c => [c.key, c]));
  const activeCols = selectedColumnKeys
    .map(key => colMap.get(key))
    .filter((col): col is CsvColumnOption => col !== undefined);

  const headers = activeCols.map(col => col.label);
  const rows: string[][] = [];

  if (layoutMode === 'split_logs') {
    seriesList.forEach(series => {
      const normalized = normalizeSeriesData(series);
      const readingLogs = normalized?.readingLogs || [];
      const collectionLogs = normalized?.collectionLogs || [];

      if (readingLogs.length <= 1 && collectionLogs.length <= 1) {
        // Single log series -> standard clean row
        const row = activeCols.map(col => {
          if (col.key === 'subLogTitle') return readingLogs[0]?.title || 'ภาคหลัก';
          if (col.key === 'readProgress') {
            const log = readingLogs[0];
            if (!log) return 'ยังไม่ได้อ่าน';
            const count = countVolumesWithin(log.ranges, log.totalVolumes);
            const total = log.totalVolumes && log.totalVolumes > 0 ? `/${log.totalVolumes} เล่ม` : ' เล่ม';
            return `อ่านแล้ว ${count}${total}`;
          }
          if (col.key === 'collectionProgress') {
            if (!series.isCollecting) return 'ไม่ได้เก็บสะสม';
            const log = collectionLogs[0];
            if (!log) return 'ยังไม่มีเล่ม';
            return formatLogProgress(log, series.isCollectingStopped ? ' (เลิกตามแล้ว)' : '');
          }
          if (col.key === 'collectionLanguage') {
            const log = collectionLogs[0];
            return series.isCollecting && log?.ranges.length ? LANGUAGE_SHORT[getLogLanguage(log)] : '-';
          }
          return String(col.getValue(series));
        });
        rows.push(row);
      } else {
        // Multi-log series -> generate 1 row per sub-log cleanly!
        const maxLogsCount = Math.max(readingLogs.length, collectionLogs.length, 1);

        for (let i = 0; i < maxLogsCount; i++) {
          // Rows past the last log of one kind exist only for extra logs of the other kind (a prequel, a JP
          // edition); they must not repeat the main log's reading or collection data.
          const rLog = readingLogs[i];
          const cLog = collectionLogs[i];

          const rReadCount = rLog ? countVolumesWithin(rLog.ranges, rLog.totalVolumes) : 0;
          const rTotal = rLog?.totalVolumes && rLog.totalVolumes > 0 ? `/${rLog.totalVolumes} เล่ม` : ' เล่ม';
          const rRangesText = rLog ? formatVolumeRangesString(rLog.ranges) : 'ไม่มี';

          const cOwnedCount = cLog ? getSetFromRanges(cLog.ranges).size : 0;
          const cIsThai = !cLog || getLogLanguage(cLog) === 'th';

          const subTitle = rLog?.title || (cLog ? getCollectionLogLabel(cLog) : `ภาคที่ ${i + 1}`);

          const row = activeCols.map(col => {
            if (col.key === 'subLogTitle') {
              return subTitle;
            }
            if (col.key === 'readProgress') {
              return rLog ? `อ่านแล้ว ${rReadCount}${rTotal}` : '-';
            }
            if (col.key === 'collectionProgress') {
              if (!series.isCollecting) return 'ไม่ได้เก็บสะสม';
              return cLog ? formatLogProgress(cLog, series.isCollectingStopped ? ' (เลิกตามแล้ว)' : '') : '-';
            }
            if (col.key === 'collectionRangesDetail') {
              if (!series.isCollecting) return 'ไม่ได้เก็บสะสม';
              return cLog ? formatLogRanges(cLog) : '-';
            }
            if (col.key === 'collectionLanguage') {
              return series.isCollecting && cLog?.ranges.length ? LANGUAGE_SHORT[getLogLanguage(cLog)] : '-';
            }
            if (col.key === 'readRangesDetail') {
              return rLog ? `[${rRangesText}]` : '-';
            }
            if (col.key === 'totalReadCount') {
              return rLog ? String(rReadCount) : '-';
            }
            if (col.key === 'totalReadMax') {
              return rLog ? String(rLog.totalVolumes || 0) : '-';
            }
            if (col.key === 'totalOwnedCount') {
              if (series.isCollecting && !cLog) return '-';
              return String(series.isCollecting && cIsThai ? cOwnedCount : 0);
            }
            if (col.key === 'totalOwnedOtherLanguage') {
              if (series.isCollecting && !cLog) return '-';
              return String(series.isCollecting && !cIsThai ? cOwnedCount : 0);
            }
            return String(col.getValue(series));
          });

          rows.push(row);
        }
      }
    });
  } else {
    // Default 'series' mode (1 row per series)
    seriesList.forEach(series => {
      const row = activeCols.map(col => String(col.getValue(series)));
      rows.push(row);
    });
  }

  const headerLine = headers.map(escapeCsvValue).join(',');
  const rowLines = rows.map(row => row.map(escapeCsvValue).join(','));

  const rawCsv = [headerLine, ...rowLines].join('\n');
  const csvString = includeBom ? `\uFEFF${rawCsv}` : rawCsv;

  return { csvString, headers, rows };
}

/**
 * Triggers browser download of CSV file.
 */
export function downloadCsvFile(csvContentWithBom: string, filename: string = 'manga_tracker_export.csv'): void {
  const blob = new Blob([csvContentWithBom], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

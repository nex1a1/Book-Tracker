import { Series } from "../types";
import { TYPE_LABEL, STATUS_LABEL } from "./constants";
import { normalizeSeriesData, getSetFromRanges } from "./helpers";

export type ExportLayoutMode = 'series' | 'split_logs';

export interface CsvColumnOption {
  key: keyof Series | 'publishPeriod' | 'subLogTitle' | 'readProgress' | 'collectionProgress' | 'totalReadCount' | 'totalReadMax' | 'totalOwnedCount' | 'readRangesDetail' | 'collectionRangesDetail';
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
 * Formats VolumeRange array to human readable range string (e.g. [[1, 20], [21, 21]] -> "1-20, 21")
 */
export function formatVolumeRangesString(ranges: [number, number][] | undefined | null): string {
  if (!ranges || ranges.length === 0) return 'ไม่มี';
  return ranges.map(([s, e]) => s === e ? `${s}` : `${s}-${e}`).join(', ');
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

  return normalized.collectionLogs.map(log => {
    const ownedCount = getSetFromRanges(log.ranges).size;
    const totalText = log.totalVolumes && log.totalVolumes > 0 ? `/${log.totalVolumes} เล่ม` : ' เล่ม';
    const prefix = logTitle ? '' : `${log.title}: `;
    return `${prefix}มีแล้ว ${ownedCount}${totalText}`;
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
  { key: 'isCollecting', label: 'สถานะสะสม', defaultSelected: true, getValue: (item) => item.isCollecting ? 'กำลังสะสม' : 'ไม่ได้เก็บสะสม' },
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
        const readCount = getSetFromRanges(log.ranges).size;
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
      return normalized.readingLogs.reduce((sum, log) => sum + getSetFromRanges(log.ranges).size, 0);
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
    label: 'จำนวนเล่มที่มีรวม',
    defaultSelected: false,
    getValue: (item) => {
      if (!item.isCollecting) return 0;
      const normalized = normalizeSeriesData(item);
      if (!normalized || !normalized.collectionLogs) return 0;
      return normalized.collectionLogs.reduce((sum, log) => sum + getSetFromRanges(log.ranges).size, 0);
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
      return normalized.collectionLogs.map(log => `${log.title}: [${formatVolumeRangesString(log.ranges)}]`).join(' | ');
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
function escapeCsvValue(val: string | number): string {
  const stringVal = String(val ?? '');
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
  const colMap = new Map(CSV_COLUMNS.map(c => [c.key, c]));
  const activeCols = selectedColumnKeys
    .map(key => colMap.get(key as any))
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
            const count = getSetFromRanges(log.ranges).size;
            const total = log.totalVolumes && log.totalVolumes > 0 ? `/${log.totalVolumes} เล่ม` : ' เล่ม';
            return `อ่านแล้ว ${count}${total}`;
          }
          if (col.key === 'collectionProgress') {
            if (!series.isCollecting) return 'ไม่ได้เก็บสะสม';
            const log = collectionLogs[0];
            if (!log) return 'ยังไม่มีเล่ม';
            const count = getSetFromRanges(log.ranges).size;
            const total = log.totalVolumes && log.totalVolumes > 0 ? `/${log.totalVolumes} เล่ม` : ' เล่ม';
            return `มีแล้ว ${count}${total}`;
          }
          return String(col.getValue(series));
        });
        rows.push(row);
      } else {
        // Multi-log series -> generate 1 row per sub-log cleanly!
        const maxLogsCount = Math.max(readingLogs.length, collectionLogs.length, 1);

        for (let i = 0; i < maxLogsCount; i++) {
          const rLog = readingLogs[i] || readingLogs[0];
          const cLog = collectionLogs[i] || collectionLogs[0];

          const rReadCount = rLog ? getSetFromRanges(rLog.ranges).size : 0;
          const rTotal = rLog?.totalVolumes && rLog.totalVolumes > 0 ? `/${rLog.totalVolumes} เล่ม` : ' เล่ม';
          const rRangesText = rLog ? formatVolumeRangesString(rLog.ranges) : 'ไม่มี';

          const cOwnedCount = cLog ? getSetFromRanges(cLog.ranges).size : 0;
          const cTotal = cLog?.totalVolumes && cLog.totalVolumes > 0 ? `/${cLog.totalVolumes} เล่ม` : ' เล่ม';

          const subTitle = rLog?.title || cLog?.title || `ภาคที่ ${i + 1}`;

          const row = activeCols.map(col => {
            if (col.key === 'subLogTitle') {
              return subTitle;
            }
            if (col.key === 'readProgress') {
              return rLog ? `อ่านแล้ว ${rReadCount}${rTotal}` : 'ยังไม่ได้อ่าน';
            }
            if (col.key === 'collectionProgress') {
              if (!series.isCollecting) return 'ไม่ได้เก็บสะสม';
              return cLog ? `มีแล้ว ${cOwnedCount}${cTotal}` : 'ยังไม่มีเล่ม';
            }
            if (col.key === 'readRangesDetail') {
              return `[${rRangesText}]`;
            }
            if (col.key === 'totalReadCount') {
              return String(rReadCount);
            }
            if (col.key === 'totalReadMax') {
              return String(rLog?.totalVolumes || 0);
            }
            if (col.key === 'totalOwnedCount') {
              return String(series.isCollecting ? cOwnedCount : 0);
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

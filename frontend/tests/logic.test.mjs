// Pure logic: range helpers, collection/reading status, CSV export, API helpers. No DOM.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { startVite, stopVite, series, reading, owned } from './setup.mjs';

let h, csv, api, constants;
before(async () => {
  const load = await startVite();
  h = await load('/src/utils/helpers.ts');
  csv = await load('/src/utils/csvHelper.ts');
  api = await load('/src/api/seriesApi.ts');
  constants = await load('/src/utils/constants.ts');
});
after(stopVite);

// ── helpers.ts ──────────────────────────────────────────────────────────────

test('mergeRanges: sorts, merges overlapping and touching ranges, fixes reversed bounds', () => {
  assert.deepEqual(h.mergeRanges([[8, 12], [1, 5], [6, 10]]), [[1, 12]]);
  assert.deepEqual(h.mergeRanges([[5, 1], [10, 10]]), [[1, 5], [10, 10]]);
  assert.deepEqual(h.mergeRanges([[3, 4], [1, 1]]), [[1, 1], [3, 4]]);
  assert.deepEqual(h.mergeRanges([]), []);
  assert.deepEqual(h.mergeRanges(null), []);
});

test('getSetFromRanges and formatVolumeRangesString', () => {
  assert.deepEqual([...h.getSetFromRanges([[1, 3], [2, 4]])], [1, 2, 3, 4]);
  assert.equal(h.getSetFromRanges(undefined).size, 0);
  assert.equal(h.formatVolumeRangesString([[1, 20], [22, 22]]), '1-20, 22');
  assert.equal(h.formatVolumeRangesString([]), 'ไม่มี');
});

test('getMissingVolumesText groups the gaps, says complete, and "-" when the total is unknown', () => {
  assert.equal(h.getMissingVolumesText([[1, 3], [6, 6]], 10), '4-5, 7-10');
  assert.equal(h.getMissingVolumesText([[1, 10]], 10), 'ครบถ้วน');
  assert.equal(h.getMissingVolumesText([[1, 2]], null), '-');
  assert.equal(h.getMissingVolumesText([], 0), '-');
  assert.equal(h.getMissingVolumesText([], 1), '1');
});

test('countVolumesWithin only counts 1..total when the total is known', () => {
  const ranges = [[0, 0], [1, 5], [11, 15]];
  assert.equal(h.countVolumesWithin(ranges, 10), 5);
  assert.equal(h.countVolumesWithin(ranges, null), 11); // unknown total: every volume, 0 included
  assert.equal(h.countVolumesWithin([[1, 3], [2, 4]], 10), 4);
});

test('countMissingVolumes ignores volumes past the total (regression: card said "ขาด 6-10" but count was 0)', () => {
  assert.equal(h.countMissingVolumes(owned(10, [[1, 5], [11, 15]])), 5);
  assert.equal(h.countMissingVolumes(owned(10, [[1, 10]])), 0);
  assert.equal(h.countMissingVolumes(owned(null, [[1, 2]])), 0);
  assert.equal(h.countMissingVolumes(owned(10, [[1, 2]], { isPartial: true })), 0);
});

test('getLogState classifies partial / unknown / complete / missing', () => {
  assert.equal(h.getLogState(owned(10, [[1, 2]], { isPartial: true })), 'partial');
  assert.equal(h.getLogState(owned(null, [[1, 2]])), 'unknown');
  assert.equal(h.getLogState(owned(2, [[1, 2]])), 'complete');
  assert.equal(h.getLogState(owned(3, [[1, 2]])), 'missing');
});

test('collection log language and label', () => {
  assert.equal(h.getLogLanguage({}), 'th');
  assert.equal(h.getLogLanguage({ language: 'jp' }), 'jp');
  assert.equal(h.getCollectionLogLabel({ title: 'ปกพิเศษ', language: 'jp' }), 'JP · ปกพิเศษ');
  assert.equal(h.getCollectionLogLabel({ title: '', format: 'digital' }), 'E-Book');
  assert.equal(h.getCollectionLogLabel({ title: '' }), 'เล่มปกติ');
});

test('normalizeSeriesData fills legacy single-log fields and keeps real logs', () => {
  assert.equal(h.normalizeSeriesData(null), null);
  const legacy = h.normalizeSeriesData({
    ...series(), readingLogs: [], collectionLogs: undefined, isCollectingStopped: undefined,
    totalVolumes: 10, readRanges: [[1, 2]], boughtFormat: 'digital', thaiLatestVolume: 5, boughtRanges: [[1, 1]],
  });
  assert.deepEqual(legacy.readingLogs, [{ id: 'm1', title: 'ภาคหลัก', totalVolumes: 10, ranges: [[1, 2]] }]);
  assert.deepEqual(legacy.collectionLogs, [{ id: 'c1', format: 'digital', title: 'เล่มปกติ', totalVolumes: 5, ranges: [[1, 1]] }]);
  assert.equal(legacy.isCollectingStopped, false);
  const real = series([owned(3, [])], [reading('Main', 3, [])]);
  assert.equal(h.normalizeSeriesData(real).collectionLogs, real.collectionLogs);
});

const readStats = (status, logs) => h.getSeriesDerivedStats(series([], logs, { status }));

test('reading status: finished, caught up, reading, unread', () => {
  const finished = readStats('completed', [reading('Main', 10, [[1, 10]])]);
  assert.deepEqual([finished.isFinishedReading, finished.isCaughtUp, finished.isReading, finished.isUnread], [true, false, false, false]);
  const caughtUp = readStats('ongoing', [reading('Main', 10, [[1, 10]])]);
  assert.deepEqual([caughtUp.isFinishedReading, caughtUp.isCaughtUp], [false, true]);
  const midway = readStats('ongoing', [reading('Main', 10, [[1, 3]])]);
  assert.deepEqual([midway.isReading, midway.totalReadCount, midway.totalReadJP], [true, 3, 10]);
  assert.equal(readStats('ongoing', [reading('Main', 10, [])]).isUnread, true);
});

test('reading status: one over-read log cannot hide an unread one (regression)', () => {
  const s = readStats('ongoing', [reading('A', 10, [[1, 15]]), reading('B', 5, [])]);
  assert.equal(s.isAllRead, false);
  assert.equal(s.isCaughtUp, false);
  assert.equal(s.totalReadCount, 10);
});

test('reading status: a log with no total is read but never "all read"', () => {
  const s = readStats('ongoing', [reading('Main', null, [[1, 3]])]);
  assert.deepEqual([s.isAllRead, s.isReading, s.totalReadJP], [false, true, 0]);
  // ...and beside a finished log it does not block "all read"
  assert.equal(readStats('ongoing', [reading('A', 2, [[1, 2]]), reading('B', null, [[1, 1]])]).isAllRead, true);
});

for (const [name, logs, missing, complete] of [
  ['no collection log at all', [], false, false],
  ['total volumes unknown', [owned(null, [[1, 5]])], false, false],
  ['total known with gaps', [owned(10, [[1, 5]])], true, false],
  ['total known and all owned', [owned(10, [[1, 10]])], false, true],
  ['volumes past the total do not fill a gap', [owned(10, [[1, 5], [11, 15]])], true, false],
  ['an unknown-total log beside a complete one is skipped', [owned(10, [[1, 10]]), owned(null, [])], false, true],
  ['only a "keep some volumes" log, even with a total', [owned(40, [[39, 39]], { isPartial: true })], false, false],
]) {
  test(`collection status: ${name}`, () => {
    const s = h.getSeriesDerivedStats(series(logs));
    assert.deepEqual([s.isCollectMissing, s.isCollectComplete], [missing, complete]);
  });
}

test('collection status: stopped hides "missing"; a stale stop flag on a non-collected series is ignored', () => {
  const stopped = h.getSeriesDerivedStats(series([owned(10, [[1, 5]])], [], { isCollectingStopped: true }));
  assert.deepEqual([stopped.isCollectMissing, stopped.isCollectStopped, stopped.isNotCollecting], [false, true, false]);
  const notCollecting = h.getSeriesDerivedStats(series([owned(10, [[1, 5]])], [], { isCollecting: false, isCollectingStopped: true }));
  assert.deepEqual([notCollecting.isCollectMissing, notCollecting.isCollectStopped, notCollecting.isNotCollecting], [false, false, true]);
});

// ── constants.ts ────────────────────────────────────────────────────────────

test('every type, status and language has a label', () => {
  assert.deepEqual(Object.keys(constants.TYPE_LABEL), ['manga', 'novel', 'light_novel']);
  assert.deepEqual(Object.keys(constants.STATUS_LABEL), ['ongoing', 'completed', 'hiatus', 'cancelled']);
  assert.deepEqual(Object.keys(constants.LANGUAGE_LABEL), Object.keys(constants.LANGUAGE_SHORT));
  assert.deepEqual(Object.keys(constants.FORMAT_LABEL), ['normal', 'bigbook', 'pocket', 'digital', 'omnibus']);
});

// ── csvHelper.ts ────────────────────────────────────────────────────────────

test('formatYearRange', () => {
  assert.equal(csv.formatYearRange(null, null), '-');
  assert.equal(csv.formatYearRange(null, 2010), '2010');
  assert.equal(csv.formatYearRange(2000, 2000), '2000');
  assert.equal(csv.formatYearRange(2000, 2010), '2000-2010');
  assert.equal(csv.formatYearRange(2000, null, 'completed'), '2000');
  assert.equal(csv.formatYearRange(2000, null, 'ongoing'), '2000-ปัจจุบัน');
});

const rich = () => series(
  [owned(10, [[1, 5], [11, 11]], { title: 'ปกติ' }), owned(null, [[3, 3]], { language: 'jp', isPartial: true, title: 'ปกพิเศษ' })],
  [reading('Main', 10, [[1, 10]]), reading('Gaiden', 2, [[1, 1]])],
  { id: 7, title: 'Title, "q"', author: 'Au', publisher: 'Pub', type: 'light_novel', status: 'completed', rating: 4.5,
    publishYear: 2001, endYear: 2005, notes: 'line1\nline2' });

test('series mode: every column value', () => {
  const values = Object.fromEntries(csv.CSV_COLUMNS.map(c => [c.key, c.getValue(rich())]));
  assert.deepEqual(values, {
    id: 7,
    title: 'Title, "q"',
    subLogTitle: 'Main, Gaiden',
    author: 'Au',
    publisher: 'Pub',
    type: 'Light Novel',
    status: 'จบแล้ว',
    isCollecting: 'กำลังสะสม',
    rating: 4.5,
    publishPeriod: '2001-2005',
    readProgress: 'Main: อ่านแล้ว 10/10 เล่ม | Gaiden: อ่านแล้ว 1/2 เล่ม',
    collectionProgress: 'ปกติ: มีแล้ว 5/10 เล่ม | JP · ปกพิเศษ: เก็บบางเล่ม [3]',
    totalReadCount: 11,
    totalReadMax: 12,
    totalOwnedCount: 6, // physical books: volume 11 is owned even though it is past the total
    totalOwnedOtherLanguage: 1,
    collectionLanguage: 'TH, JP',
    readRangesDetail: 'Main: [1-10] | Gaiden: [1]',
    collectionRangesDetail: 'ปกติ: [1-5, 11] | JP · ปกพิเศษ: [3]',
    publishYear: 2001,
    endYear: 2005,
    notes: 'line1\nline2',
  });
});

test('series mode: a series that is not collected, and one that stopped', () => {
  const off = { ...rich(), isCollecting: false };
  const get = (s, key) => csv.CSV_COLUMNS.find(c => c.key === key).getValue(s);
  assert.equal(get(off, 'isCollecting'), 'ไม่ได้เก็บสะสม');
  assert.equal(get(off, 'collectionProgress'), 'ไม่ได้เก็บสะสม');
  assert.equal(get(off, 'totalOwnedCount'), 0);
  assert.equal(get(off, 'collectionLanguage'), '-');
  const stopped = { ...rich(), isCollectingStopped: true };
  assert.equal(get(stopped, 'isCollecting'), 'เลิกตามแล้ว');
  assert.match(get(stopped, 'collectionProgress'), /มีแล้ว 5\/10 เล่ม \(เลิกตามแล้ว\)/);
  assert.equal(get({ ...rich(), notes: undefined, publishYear: null }, 'notes'), '');
});

test('generateCsvData: column order follows the selection, values are escaped, BOM only on request', () => {
  const out = csv.generateCsvData([rich()], ['notes', 'title', 'nope', 'id'], false);
  assert.deepEqual(out.headers, ['บันทึกเพิ่มเติม', 'ชื่อเรื่อง', 'ID']);
  assert.equal(out.csvString, 'บันทึกเพิ่มเติม,ชื่อเรื่อง,ID\n"line1\nline2","Title, ""q""",7');
  assert.ok(csv.generateCsvData([rich()], ['id'], true).csvString.startsWith('﻿ID\n7'));
  assert.equal(csv.generateCsvData([], ['id']).csvString, 'ID');
});

test('generateCsvData: text that spreadsheets would run as a formula is kept as text', () => {
  const cell = title => csv.generateCsvData([{ ...rich(), title }], ['title']).csvString.split('\n')[1];
  assert.equal(cell('=HYPERLINK("http://x","go")'), `"'=HYPERLINK(""http://x"",""go"")"`);
  assert.equal(cell('+1+1'), "'+1+1");
  assert.equal(cell('-2+3'), "'-2+3");
  assert.equal(cell('@SUM(1)'), "'@SUM(1)");
  // ordinary text, the lone "-" placeholder and a dash inside a title are left alone
  assert.deepEqual(['Naruto', '-', 'Re-Zero', '1-20'].map(cell), ['Naruto', '-', 'Re-Zero', '1-20']);
  // the on-screen preview rows keep the real value; only the CSV text is guarded
  assert.equal(csv.generateCsvData([{ ...rich(), title: '=1' }], ['title']).rows[0][0], '=1');
});

const splitRows = (s, columns) => csv.generateCsvData([s], columns, false, 'split_logs').rows;

test('split_logs: a single-log series is one clean row, counted inside its total', () => {
  const s = series([owned(10, [[1, 5], [11, 15]])], [reading('Main', 10, [[1, 12]])], { isCollectingStopped: true });
  assert.deepEqual(splitRows(s, ['subLogTitle', 'readProgress', 'collectionProgress', 'collectionLanguage']), [
    ['Main', 'อ่านแล้ว 10/10 เล่ม', 'มีแล้ว 5/10 เล่ม (เลิกตามแล้ว)', 'TH'],
  ]);
  assert.deepEqual(splitRows(series([], []), ['subLogTitle', 'readProgress', 'collectionProgress']),
    [['ภาคหลัก', 'อ่านแล้ว 0 เล่ม', 'มีแล้ว 0 เล่ม']]);
  assert.deepEqual(splitRows({ ...s, isCollecting: false }, ['collectionProgress', 'collectionLanguage']), [['ไม่ได้เก็บสะสม', '-']]);
});

test('split_logs: a collection log is not repeated on rows past its last log, so owned counts never double', () => {
  const jjk = series([owned(30, [[1, 25]])], [reading('Main', 30, [[1, 30]]), reading('Zero', 1, [[1, 1]])]);
  assert.deepEqual(splitRows(jjk, ['subLogTitle', 'collectionProgress', 'totalOwnedCount', 'collectionRangesDetail']), [
    ['Main', 'มีแล้ว 25/30 เล่ม', '25', 'เล่มปกติ: [1-25]'],
    ['Zero', '-', '-', '-'],
  ]);
});

test('split_logs: with fewer collection logs than reading logs only the extra rows go blank', () => {
  const s = series(
    [owned(11, [[1, 11]]), owned(1, [[1, 1]])],
    [reading('Main', 22, [[1, 22]]), reading('Second', 2, [[1, 2]]), reading('Special', 1, [[1, 1]])]);
  assert.deepEqual(splitRows(s, ['totalOwnedCount']).flat(), ['11', '1', '-']);
});

test('split_logs: an extra-language edition gets its own row without repeating reading progress', () => {
  const aoashi = series(
    [owned(40, [[1, 35]]), owned(null, [[39, 39]], { language: 'jp', isPartial: true, title: 'ปกพิเศษ' })],
    [reading('Main', 40, [[1, 40]])]);
  assert.deepEqual(splitRows(aoashi, ['subLogTitle', 'readProgress', 'readRangesDetail', 'totalReadCount', 'totalReadMax',
    'collectionProgress', 'totalOwnedCount', 'totalOwnedOtherLanguage', 'collectionLanguage']), [
    ['Main', 'อ่านแล้ว 40/40 เล่ม', '[1-40]', '40', '40', 'มีแล้ว 35/40 เล่ม', '35', '0', 'TH'],
    ['JP · ปกพิเศษ', '-', '-', '-', '-', 'เก็บบางเล่ม [39]', '0', '1', 'JP'],
  ]);
});

test('split_logs: a series that is not collected reads "not collected" on every row', () => {
  const s = series([owned(30, [[1, 25]])], [reading('Main', 30, []), reading('Zero', 1, [])], { isCollecting: false });
  assert.deepEqual(splitRows(s, ['collectionProgress', 'totalOwnedCount', 'collectionRangesDetail']), [
    ['ไม่ได้เก็บสะสม', '0', 'ไม่ได้เก็บสะสม'],
    ['ไม่ได้เก็บสะสม', '0', 'ไม่ได้เก็บสะสม'],
  ]);
});

test('split_logs: columns with no per-log meaning fall back to the series value', () => {
  const s = series([owned(1, [[1, 1]]), owned(1, [])], [reading('Main', 1, [])], { title: 'X' });
  assert.deepEqual(splitRows(s, ['title']), [['X'], ['X']]);
});

// ── api/seriesApi.ts ────────────────────────────────────────────────────────

test('apiErrorMessage surfaces the first rejected field, then the server error, then the fallback', () => {
  const axiosErr = data => ({ isAxiosError: true, response: { data } });
  assert.equal(api.apiErrorMessage(axiosErr({ error: 'x', details: [{ path: 'title', message: 'm' }] }), 'F'), 'F: m (title)');
  assert.equal(api.apiErrorMessage(axiosErr({ error: 'x' }), 'F'), 'F: x');
  assert.equal(api.apiErrorMessage(new Error('boom'), 'F'), 'F');
});

test('coverSrc routes remote covers through the backend cache only', () => {
  assert.equal(api.coverSrc('https://a.b/c.jpg?x=1'), '/api/cover?url=https%3A%2F%2Fa.b%2Fc.jpg%3Fx%3D1');
  assert.equal(api.coverSrc('HTTP://a.b/c.jpg'), '/api/cover?url=HTTP%3A%2F%2Fa.b%2Fc.jpg');
  assert.equal(api.coverSrc('data:image/png;base64,AA'), 'data:image/png;base64,AA');
  assert.equal(api.coverSrc(''), '');
});

test('seriesApi calls the right endpoints', async () => {
  const calls = [];
  const saved = { get: axios.get, post: axios.post, patch: axios.patch, delete: axios.delete };
  for (const m of Object.keys(saved)) axios[m] = async (...args) => { calls.push([m, ...args]); return { data: {} }; };
  try {
    await api.seriesApi.getAll({ limit: 5 });
    await api.seriesApi.getStats();
    await api.seriesApi.getAuthors();
    await api.seriesApi.getPublishers();
    await api.seriesApi.create({ title: 'a' });
    await api.seriesApi.update('3', { rating: 1 });
    await api.seriesApi.delete('3');
  } finally {
    Object.assign(axios, saved);
  }
  assert.deepEqual(calls, [
    ['get', '/api/series', { params: { limit: 5 } }],
    ['get', '/api/series/stats'],
    ['get', '/api/authors'],
    ['get', '/api/publishers'],
    ['post', '/api/series', { title: 'a' }],
    ['patch', '/api/series/3', { rating: 1 }],
    ['delete', '/api/series/3'],
  ]);
});

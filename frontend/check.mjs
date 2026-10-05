// Logic check for the frontend's pure helpers (CSV export rows, collection status). It loads the real
// TypeScript sources through Vite, so it needs no extra dependency or build step. Run: npm run check
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

let vite, csv, helpers;
before(async () => {
  vite = await createServer({ configFile: false, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true, watch: null } });
  csv = await vite.ssrLoadModule('/src/utils/csvHelper.ts');
  helpers = await vite.ssrLoadModule('/src/utils/helpers.ts');
});
after(() => vite.close());

const series = (collectionLogs, readingLogs = [], extra = {}) => ({
  _id: '1', id: 1, title: 'T', author: 'A', publisher: 'P', type: 'manga', status: 'ongoing',
  isCollecting: true, rating: 0, readingLogs, collectionLogs, ...extra,
});
const reading = (title, totalVolumes, ranges) => ({ id: title, title, totalVolumes, ranges });
let nextId = 0;
const owned = (totalVolumes, ranges, extra = {}) => ({ id: `c${nextId++}`, title: '', format: 'normal', totalVolumes, ranges, ...extra });
const splitRows = (s, columns) => csv.generateCsvData([s], columns, false, 'split_logs').rows;

test('split_logs: a collection log is not repeated on rows past its last log, so owned counts never double', () => {
  // main + prequel are read but there is one collection log: the prequel row owns nothing
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
  assert.deepEqual(splitRows(aoashi, ['readProgress', 'collectionProgress', 'totalOwnedCount', 'totalOwnedOtherLanguage']), [
    ['อ่านแล้ว 40/40 เล่ม', 'มีแล้ว 35/40 เล่ม', '35', '0'],
    ['-', 'เก็บบางเล่ม [39]', '0', '1'],
  ]);
});

test('split_logs: a series that is not collected reads "not collected" on every row', () => {
  const s = series([owned(30, [[1, 25]])], [reading('Main', 30, []), reading('Zero', 1, [])], { isCollecting: false });
  assert.deepEqual(splitRows(s, ['collectionProgress', 'totalOwnedCount', 'collectionRangesDetail']), [
    ['ไม่ได้เก็บสะสม', '0', 'ไม่ได้เก็บสะสม'],
    ['ไม่ได้เก็บสะสม', '0', 'ไม่ได้เก็บสะสม'],
  ]);
});

for (const [name, logs, missing, complete] of [
  ['no collection log at all', [], false, false],
  ['total volumes unknown', [owned(null, [[1, 5]])], false, false],
  ['total known with gaps', [owned(10, [[1, 5]])], true, false],
  ['total known and all owned', [owned(10, [[1, 10]])], false, true],
  ['an unknown-total log beside a complete one is skipped', [owned(10, [[1, 10]]), owned(null, [])], false, true],
  // the form's live preview still holds the total of a log that was just switched to "keep some volumes"
  ['only a "keep some volumes" log, even with a total', [owned(40, [[39, 39]], { isPartial: true })], false, false],
]) {
  test(`collection status: ${name}`, () => {
    const s = helpers.getSeriesDerivedStats(series(logs));
    assert.deepEqual([s.isCollectMissing, s.isCollectComplete], [missing, complete]);
  });
}

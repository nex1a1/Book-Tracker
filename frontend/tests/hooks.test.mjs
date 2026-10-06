// Zustand store and the series hooks (filtering/sorting, missing-volume checklist), mounted in jsdom.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startVite, stopVite, installDom, renderHook, toastMessages as sharedToastMessages, series, reading, owned } from './setup.mjs';

installDom();
const React = await import('react');
const { default: toast } = await import('react-hot-toast');

let store, api, filtered, missing, EMPTY;
before(async () => {
  const load = await startVite();
  ({ useSeriesStore: store, EMPTY_FILTER: EMPTY } = await load('/src/store/useSeriesStore.ts'));
  ({ seriesApi: api } = await load('/src/api/seriesApi.ts'));
  filtered = await load('/src/features/series/hooks/useFilteredSeries.ts');
  missing = await load('/src/features/series/hooks/useMissingVolumes.ts');
});
after(stopVite);

const savedApi = {};
beforeEach(() => {
  if (!savedApi.getAll) Object.assign(savedApi, api);
  Object.assign(api, savedApi);
  store.setState({ series: [], stats: null, loading: false, authors: [], publishers: [], filter: { ...EMPTY, limit: 1000 } });
  localStorage.clear();
  toast.remove();
});

const toastMessages = () => sharedToastMessages(React);
const settle = () => React.act(() => new Promise(r => setTimeout(r, 0)));

// ── store ───────────────────────────────────────────────────────────────────

test('store: fetchSeries asks for up to 1000 series and stores them', async () => {
  let params;
  api.getAll = async p => { params = p; return { data: { data: [series()] } }; };
  await store.getState().fetchSeries();
  assert.deepEqual(params, { limit: 1000 });
  assert.equal(store.getState().series.length, 1);
  assert.equal(store.getState().loading, false);
});

test('store: a failed fetch keeps the old list, clears loading and says so', async () => {
  store.setState({ series: [series()] });
  api.getAll = async () => { throw new Error('down'); };
  api.getStats = async () => { throw new Error('down'); };
  api.getAuthors = async () => { throw new Error('down'); };
  api.getPublishers = async () => ({ data: [] });
  await store.getState().fetchSeries();
  await store.getState().fetchStats();
  await store.getState().fetchMetadata();
  assert.equal(store.getState().series.length, 1);
  assert.equal(store.getState().loading, false);
  assert.deepEqual(await toastMessages(), [
    'error:ดึงข้อมูลผู้แต่ง/สำนักพิมพ์ไม่สำเร็จ', 'error:ดึงข้อมูลสถิติไม่สำเร็จ', 'error:ดึงข้อมูลซีรีส์ไม่สำเร็จ',
  ]);
});

test('store: fetchStats and fetchMetadata', async () => {
  const stats = { byType: [], byStatus: [], totals: { totalSeries: 1, collecting: 1, totalRead: 3 } };
  api.getStats = async () => ({ data: stats });
  api.getAuthors = async () => ({ data: [{ id: 1, name: 'A' }] });
  api.getPublishers = async () => ({ data: [{ id: 2, name: 'P' }] });
  await store.getState().fetchStats();
  await store.getState().fetchMetadata();
  assert.deepEqual(store.getState().stats, stats);
  assert.deepEqual(store.getState().authors, [{ id: 1, name: 'A' }]);
  assert.deepEqual(store.getState().publishers, [{ id: 2, name: 'P' }]);
});

test('store: setFilter merges, resetFilter restores the defaults (keeping the 1000 limit)', () => {
  store.getState().setFilter({ search: 'x', type: ['manga'] });
  assert.equal(store.getState().filter.search, 'x');
  assert.equal(store.getState().filter.sortBy, 'updatedAt');
  store.getState().resetFilter();
  assert.deepEqual(store.getState().filter, { ...EMPTY, limit: 1000 });
  store.getState().setViewMode('list');
  assert.equal(store.getState().viewMode, 'list');
});

test('store: updateSeriesRating saves then updates locally; a failed save changes nothing', async () => {
  store.setState({ series: [series([], [], { _id: '1', rating: 1 }), series([], [], { _id: '2', rating: 2 })] });
  let sent;
  api.update = async (id, body) => { sent = [id, body]; };
  await store.getState().updateSeriesRating('2', 4.5);
  assert.deepEqual(sent, ['2', { rating: 4.5 }]);
  assert.deepEqual(store.getState().series.map(s => s.rating), [1, 4.5]);
  api.update = async () => { throw new Error('x'); };
  await store.getState().updateSeriesRating('1', 3);
  assert.deepEqual(store.getState().series.map(s => s.rating), [1, 4.5]);
  assert.deepEqual(await toastMessages(), ['error:บันทึก rating ไม่สำเร็จ']);
});

test('store: deleteSeries deletes then refreshes the list, stats and metadata', async () => {
  const called = [];
  api.delete = async id => { called.push(`delete ${id}`); };
  api.getAll = async () => { called.push('getAll'); return { data: { data: [] } }; };
  api.getStats = async () => { called.push('getStats'); return { data: null }; };
  api.getAuthors = async () => { called.push('getAuthors'); return { data: [] }; };
  api.getPublishers = async () => ({ data: [] });
  await store.getState().deleteSeries('9');
  await settle();
  assert.deepEqual(called, ['delete 9', 'getAll', 'getStats', 'getAuthors']);
  assert.deepEqual(await toastMessages(), ['success:ลบสำเร็จ']);
  api.delete = async () => { throw new Error('x'); };
  toast.remove();
  await store.getState().deleteSeries('9');
  assert.deepEqual(await toastMessages(), ['error:ลบไม่สำเร็จ']);
});

// ── useFilteredSeries ───────────────────────────────────────────────────────

// A: caught up, missing 6-10 | B: finished, complete | C: unread, not collected | D: reading, stopped, owns a JP volume
const A = series([owned(10, [[1, 5]])], [reading('Main', 10, [[1, 10]])],
  { _id: 'A', title: 'เกม', author: 'X', publisher: 'P1', type: 'manga', status: 'ongoing', rating: 0, publishYear: 2010, updatedAt: '2026-01-03 00:00:00' });
const B = series([owned(5, [[1, 5]])], [reading('Main', 5, [[1, 5]])],
  { _id: 'B', title: 'Alpha', author: 'Yamada', publisher: 'P2', type: 'novel', status: 'completed', rating: 4, publishYear: 2015, updatedAt: '2026-01-01 00:00:00' });
const C = series([owned(3, [])], [reading('Main', null, [])],
  { _id: 'C', title: 'ขนม', author: 'Z', publisher: 'P1', type: 'light_novel', status: 'hiatus', rating: 2.5, publishYear: null, isCollecting: false, updatedAt: '2026-01-02 00:00:00' });
const D = series([owned(10, [[1, 2]]), owned(null, [[1, 1]], { language: 'jp', isPartial: true })], [reading('Main', 10, [[1, 3]])],
  { _id: 'D', title: 'ไข่', author: 'W', publisher: 'P2', type: 'manga', status: 'cancelled', rating: 5, publishYear: 2020, isCollectingStopped: true, updatedAt: '2026-01-04 00:00:00' });
const ALL = [A, B, C, D];

const run = async patch => {
  const filter = { ...EMPTY, ...patch };
  const { result, unmount } = await renderHook(React, () => filtered.useFilteredSeries(ALL, filter));
  await unmount();
  return { ids: result.current.displaySeries.map(s => s._id), count: result.current.activeFilterCount };
};
const ids = async patch => (await run(patch)).ids.sort().join('');

for (const [name, patch, expected] of [
  ['search by author, case-insensitive', { search: 'yama' }, 'B'],
  ['search by publisher', { search: 'p1' }, 'AC'],
  ['search by title', { search: 'ไข' }, 'D'],
  ['type', { type: ['manga'] }, 'AD'],
  ['status', { status: ['completed', 'hiatus'] }, 'BC'],
  ['publisher', { publisher: ['P2'] }, 'BD'],
  ['year from (no year never matches)', { yearFrom: '2012' }, 'BD'],
  ['year to', { yearTo: 2012 }, 'A'],
  ['unrated only', { unratedOnly: true, minRating: 4 }, 'A'],
  ['min rating', { minRating: 3 }, 'BD'],
  ['max rating excludes unrated', { maxRating: 3 }, 'C'],
  ['rating range', { minRating: 2, maxRating: 4 }, 'BC'],
  ['language: JP edition owned', { language: ['jp'] }, 'D'],
  ['language: TH (a non-collected series owns nothing)', { language: ['th'] }, 'ABD'],
  ['read: finished', { readStatus: ['finished'] }, 'B'],
  ['read: caught up', { readStatus: ['caughtup'] }, 'A'],
  ['read: reading', { readStatus: ['reading'] }, 'D'],
  ['read: unread', { readStatus: ['unread'] }, 'C'],
  ['read: several states are OR-ed', { readStatus: ['finished', 'unread'] }, 'BC'],
  ['collect: complete', { collectStatus: ['complete'] }, 'B'],
  ['collect: missing (stopped is not missing)', { collectStatus: ['missing'] }, 'A'],
  ['collect: stopped', { collectStatus: ['stopped'] }, 'D'],
  ['collect: not collecting', { collectStatus: ['not_collecting'] }, 'C'],
  ['filters combine with AND', { type: ['manga'], publisher: ['P1'] }, 'A'],
]) {
  test(`useFilteredSeries filter: ${name}`, async () => assert.equal(await ids(patch), expected));
}

test('useFilteredSeries: activeFilterCount counts each active filter once', async () => {
  assert.equal((await run({})).count, 0);
  assert.equal((await run({ search: 'x', type: ['manga'], status: ['ongoing'], publisher: ['P'], readStatus: ['reading'],
    collectStatus: ['missing'], language: ['th'], minRating: 1, maxRating: 2, yearFrom: 1, yearTo: 2 })).count, 10);
  assert.equal((await run({ unratedOnly: true })).count, 1);
});

for (const [sortBy, sortOrder, expected] of [
  ['title', 'ASC', ['A', 'C', 'D', 'B']], // Thai dictionary order (เกม before ขนม), not code-unit order
  ['title', 'DESC', ['B', 'D', 'C', 'A']],
  ['rating', 'DESC', ['D', 'B', 'C', 'A']],
  ['publishYear', 'ASC', ['A', 'B', 'D', 'C']], // no year sorts last both ways
  ['publishYear', 'DESC', ['D', 'B', 'A', 'C']],
  ['updatedAt', 'DESC', ['D', 'A', 'C', 'B']],
  ['readProgress', 'ASC', ['D', 'A', 'B', 'C']], // C has no known total
  ['missingCount', 'DESC', ['A', 'B', 'C', 'D']], // C (not collecting) and D (stopped) have no count
  ['missingCount', 'ASC', ['B', 'A', 'C', 'D']],
]) {
  test(`useFilteredSeries sort: ${sortBy} ${sortOrder}`, async () => {
    assert.deepEqual((await run({ sortBy, sortOrder })).ids, expected);
  });
}

test('useFilteredSeries sort: missing count ignores volumes past the total (regression)', async () => {
  const over = series([owned(10, [[1, 5], [11, 15]])], [], { _id: 'over' });
  const two = series([owned(10, [[1, 8]])], [], { _id: 'two' });
  const { result, unmount } = await renderHook(React, () =>
    filtered.useFilteredSeries([two, over], { ...EMPTY, sortBy: 'missingCount', sortOrder: 'DESC' }));
  await unmount();
  assert.deepEqual(result.current.displaySeries.map(s => s._id), ['over', 'two']);
});

// ── useMissingList / useMissingVolumes ──────────────────────────────────────

const E = series(
  [owned(10, [[1, 5], [11, 15]], { id: 'th' }), owned(3, [[1, 1]], { id: 'jp', language: 'jp' }), owned(null, [], { id: 'unk' }),
    owned(5, [], { id: 'part', isPartial: true })],
  [], { _id: 'E', title: 'Edge', author: 'Q', publisher: '' });

test('useMissingList: only collecting, not-stopped series with a judgeable gap; counts stay inside the total', async () => {
  store.setState({ series: [...ALL, E] });
  const { result, unmount } = await renderHook(React, missing.useMissingList);
  await unmount();
  assert.deepEqual(result.current.map(i => [i._id, i.publisher, i.typeStr]), [['A', 'P1', 'Manga'], ['E', 'ไม่ระบุสำนักพิมพ์', 'Manga']]);
  assert.deepEqual(result.current[1].formats.map(f => [f.id, f.title, f.missingText, f.missingCount]), [
    ['th', 'เล่มปกติ', '6-10', 5],
    ['jp', 'JP · เล่มปกติ', '2-3', 2],
  ]);
});

const mountChecklist = () => renderHook(React, missing.useMissingVolumes);
const KEY = 'manga-tracker:missing-checklist-checked';

test('useMissingVolumes: search, publisher filter, grouping and totals', async () => {
  const F = series([owned(4, [[1, 1]])], [], { _id: 'F', title: 'Fruit', author: 'Mori', publisher: 'P2' });
  store.setState({ series: [A, E, F] });
  const { result, unmount } = await mountChecklist();
  assert.deepEqual(result.current.publisherOptions, ['P1', 'P2', 'ไม่ระบุสำนักพิมพ์']);
  assert.deepEqual(result.current.stats, { totalSeries: 3, totalVolumes: 5 + 7 + 3, checkedVolumes: 0, checkedItemsCount: 0 });
  assert.deepEqual(Object.keys(result.current.groupedByPublisher), ['P1', 'ไม่ระบุสำนักพิมพ์', 'P2']);

  await React.act(async () => result.current.setSearchQuery('MORI'));
  assert.deepEqual(result.current.filteredList.map(i => i._id), ['F']);
  await React.act(async () => result.current.setSearchQuery(''));
  await React.act(async () => result.current.setSelectedPublisher(['P1', 'P2']));
  assert.deepEqual(result.current.filteredList.map(i => i._id), ['A', 'F']);
  await React.act(async () => result.current.setSelectedPublisher([]));
  assert.equal(result.current.filteredList.length, 3);

  await React.act(async () => result.current.toggleCollapsePub('P1'));
  assert.ok(result.current.collapsedPubs.has('P1'));
  await React.act(async () => result.current.toggleCollapsePub('P1'));
  assert.equal(result.current.collapsedPubs.size, 0);
  await React.act(async () => result.current.setViewMode('list'));
  assert.equal(result.current.viewMode, 'list');
  await unmount();
});

test('useMissingVolumes: ticks are counted, saved, survive a reopen, and can be cleared', async () => {
  store.setState({ series: [A, E] });
  let view = await mountChecklist();
  await React.act(async () => view.result.current.toggleCheckItem('E-th'));
  assert.deepEqual(view.result.current.stats, { totalSeries: 2, totalVolumes: 12, checkedVolumes: 5, checkedItemsCount: 1 });
  assert.deepEqual(JSON.parse(localStorage.getItem(KEY)), ['E-th']);
  await view.unmount();

  view = await mountChecklist();
  assert.ok(view.result.current.checkedItems.has('E-th'));
  await React.act(async () => view.result.current.toggleCheckItem('E-th'));
  assert.equal(view.result.current.checkedItems.size, 0);
  await React.act(async () => view.result.current.toggleCheckItem('A-' + A.collectionLogs[0].id));
  await React.act(async () => view.result.current.clearCheckedItems());
  assert.equal(view.result.current.checkedItems.size, 0);
  await view.unmount();
});

test('useMissingVolumes: a tick for something no longer missing is dropped', async () => {
  store.setState({ series: [A, E] });
  localStorage.setItem(KEY, JSON.stringify(['E-th', 'gone-1']));
  const view = await mountChecklist();
  assert.deepEqual([...view.result.current.checkedItems], ['E-th']);
  // the user completes E's Thai log in the edit dialog
  const fixed = { ...E, collectionLogs: E.collectionLogs.map(l => l.id === 'th' ? { ...l, ranges: [[1, 10]] } : l) };
  await React.act(async () => store.setState({ series: [A, fixed] }));
  assert.equal(view.result.current.checkedItems.size, 0);
  await view.unmount();
});

test('useMissingVolumes: a previous trip that ticked everything starts fresh on the next open', async () => {
  store.setState({ series: [A] });
  localStorage.setItem(KEY, JSON.stringify([`A-${A.collectionLogs[0].id}`]));
  const view = await mountChecklist();
  assert.equal(view.result.current.checkedItems.size, 0);
  // ...but ticking the last item now does not wipe it under the user's finger
  await React.act(async () => view.result.current.toggleCheckItem(`A-${A.collectionLogs[0].id}`));
  assert.equal(view.result.current.checkedItems.size, 1);
  await view.unmount();
});

test('useMissingVolumes: unreadable saved ticks start empty', async () => {
  store.setState({ series: [A] });
  localStorage.setItem(KEY, '{not json');
  const view = await mountChecklist();
  assert.equal(view.result.current.checkedItems.size, 0);
  await view.unmount();
});

// Shared UI components and the filter sidebar, rendered into jsdom and driven through real DOM events.
import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  startVite, stopVite, installDom, render, cleanup, toastMessages, click, type, key, flush, byText, text, owned,
} from './setup.mjs';

installDom();
const React = await import('react');
const { default: toast } = await import('react-hot-toast');
const h = React.createElement;

let C = {}, EMPTY;
before(async () => {
  const load = await startVite();
  for (const path of ['StarRating', 'RangeEditor', 'Dropdown', 'Autocomplete', 'SortDropdown', 'PublisherDropdown', 'CollectionLogSummary', 'Icons']) {
    Object.assign(C, await load(`/src/components/${path}.tsx`));
  }
  Object.assign(C, await load('/src/features/filters/FilterSidebar.tsx'), await load('/src/features/filters/RatingFilter.tsx'));
  ({ EMPTY_FILTER: EMPTY } = await load('/src/store/useSeriesStore.ts'));
});
after(stopVite);
afterEach(async () => { await cleanup(); toast.remove(); });

const spy = () => { const fn = (...args) => { fn.calls.push(args.length > 1 ? args : args[0]); }; fn.calls = []; return fn; };

// ── StarRating ──────────────────────────────────────────────────────────────

test('StarRating: clicking a star rates it, clicking the current rating clears it', async () => {
  const onRate = spy();
  const { container, rerender } = await render(React, h(C.StarRating, { rating: 0, onRate }));
  assert.equal(container.querySelectorAll('.star-btn').length, 5);
  await click(React, container.querySelector('[aria-label="ให้ 3 ดาว"]'));
  await rerender(h(C.StarRating, { rating: 3, onRate }));
  assert.equal(container.querySelectorAll('.star-btn.filled').length, 3);
  assert.equal(text(container.querySelector('.star-label')), '3 ดาว (ดี)');
  await click(React, container.querySelector('[aria-label="ให้ 3 ดาว"]'));
  assert.deepEqual(onRate.calls, [3, 0]);
});

test('StarRating: read-only shows the value and ignores clicks', async () => {
  const onRate = spy();
  const { container } = await render(React, h(C.StarRating, { rating: 4.5, onRate, readOnly: true }));
  assert.equal(container.querySelector('[role="img"]').getAttribute('aria-label'), 'ให้ 4.5 ดาว');
  assert.ok(!container.querySelector('.star-label'));
  await click(React, container.querySelector('.star-btn'));
  assert.deepEqual(onRate.calls, []);
  for (const [r, label] of [[5, 'ยอดเยี่ยม'], [4, 'ดีมาก'], [2, 'พอใช้'], [1, 'แย่']]) {
    const v = await render(React, h(C.StarRating, { rating: r, onRate }));
    assert.match(text(v.container), new RegExp(label));
  }
});

// ── RangeEditor ─────────────────────────────────────────────────────────────

const rangeEditor = async ranges => {
  const onChange = spy();
  const view = await render(React, h(C.RangeEditor, { ranges, onChange }));
  const [start, end] = view.container.querySelectorAll('input');
  const add = async (s, e) => { await type(React, start, s); await type(React, end, e); await click(React, byText(view.container, 'เพิ่ม')); };
  return { ...view, onChange, start, end, add };
};

test('RangeEditor: adds and merges ranges, a single box means one volume', async () => {
  const r = await rangeEditor([[1, 3]]);
  await r.add('4', '6');
  assert.deepEqual(r.onChange.calls.at(-1), [[1, 6]]);
  assert.equal(r.start.value, '');
  await r.add('9', '');
  assert.deepEqual(r.onChange.calls.at(-1), [[1, 3], [9, 9]]);
  await r.add('', '7');
  assert.deepEqual(r.onChange.calls.at(-1), [[1, 3], [7, 7]]);
  await r.add('', '');
  assert.equal(r.onChange.calls.length, 3);
});

test('RangeEditor: rejects reversed, fractional and negative volumes', async () => {
  const r = await rangeEditor([]);
  await r.add('5', '2');
  await r.add('2.5', '');
  await r.add('-1', '');
  assert.deepEqual(r.onChange.calls, []);
  assert.deepEqual(await toastMessages(React), [
    'error:ระบุเล่มเป็นเลขจำนวนเต็มตั้งแต่ 0 ขึ้นไป', 'error:ระบุเล่มเป็นเลขจำนวนเต็มตั้งแต่ 0 ขึ้นไป', 'error:เล่มเริ่มต้นต้องน้อยกว่าเล่มจบ',
  ]);
});

test('RangeEditor: lists ranges and removes one', async () => {
  const r = await rangeEditor([[1, 3], [5, 5]]);
  assert.deepEqual([...r.container.querySelectorAll('.range-tag .badge')].map(text), ['1-3', '5']);
  await click(React, r.container.querySelector('[aria-label="ลบช่วงเล่ม 1-3"]'));
  assert.deepEqual(r.onChange.calls, [[[5, 5]]]);
});

// ── Dropdown ────────────────────────────────────────────────────────────────

const OPTIONS = [{ value: 'a', label: 'Apple' }, { value: 'b', label: 'Banana' }];

test('Dropdown: shows the selection, opens a list, picks an option and closes', async () => {
  const onChange = spy();
  const { container } = await render(React, h(C.Dropdown, { value: 'b', options: OPTIONS, onChange }));
  const trigger = container.querySelector('.dropdown-trigger');
  assert.equal(text(trigger), 'Banana');
  await click(React, trigger);
  assert.equal(trigger.getAttribute('aria-expanded'), 'true');
  const listbox = document.querySelector('[role="listbox"]');
  assert.deepEqual([...listbox.querySelectorAll('[role="option"]')].map(o => o.getAttribute('aria-selected')), ['false', 'true']);
  await click(React, byText(listbox, 'Apple'));
  assert.deepEqual(onChange.calls, ['a']);
  assert.ok(!document.querySelector('[role="listbox"]'));
});

test('Dropdown: keyboard open/close, click outside, unknown value and disabled', async () => {
  const { container } = await render(React, h(C.Dropdown, { value: 'zzz', options: OPTIONS, onChange: spy() }));
  const trigger = container.querySelector('.dropdown-trigger');
  assert.equal(text(trigger), 'Apple');
  await key(React, trigger, 'ArrowDown');
  assert.ok(document.querySelector('[role="listbox"]'));
  await flush(React, 20);
  await key(React, document.querySelector('[role="option"]'), 'Escape');
  assert.ok(!document.querySelector('[role="listbox"]'));
  await key(React, trigger, 'ArrowUp');
  assert.ok(document.querySelector('[role="listbox"]'));
  await click(React, document.body);
  assert.ok(!document.querySelector('[role="listbox"]'));

  const disabled = await render(React, h(C.Dropdown, { value: 'a', options: OPTIONS, onChange: spy(), disabled: true }));
  await click(React, disabled.container.querySelector('.dropdown-trigger'));
  assert.ok(!document.querySelector('[role="listbox"]'));
});

// ── Autocomplete ────────────────────────────────────────────────────────────

const NAMES = ['Alpha', 'Beta', 'Alpine', 'Gamma', 'Delta', 'Eps', 'Zeta', 'Eta', 'Theta', 'Iota'];
function ControlledAutocomplete({ log }) {
  const [value, setValue] = React.useState('');
  return h(C.Autocomplete, { value, options: NAMES, onChange: v => { log.push(v); setValue(v); } });
}

test('Autocomplete: free text, suggestions filtered case-insensitively, keyboard and click pick', async () => {
  const log = [];
  const { container } = await render(React, h(ControlledAutocomplete, { log }));
  const input = container.querySelector('input');
  await React.act(async () => input.focus()); // focusing opens the suggestions
  assert.equal(container.querySelectorAll('[role="option"]').length, 8); // empty value: first 8 only
  await type(React, input, 'AL');
  assert.deepEqual([...container.querySelectorAll('[role="option"]')].map(text), ['Alpha', 'Alpine']);
  await key(React, input, 'ArrowDown');
  await key(React, input, 'ArrowDown');
  assert.equal(input.getAttribute('aria-activedescendant')?.endsWith('-option-1'), true);
  await key(React, input, 'Enter');
  assert.deepEqual(log, ['AL', 'Alpine']);
  assert.ok(!container.querySelector('[role="listbox"]'));

  await type(React, input, 'et');
  await click(React, byText(container, 'Theta'));
  assert.equal(log.at(-1), 'Theta');
  await type(React, input, 'zzz'); // no suggestions: no menu, free text kept
  assert.ok(!container.querySelector('[role="listbox"]'));
  assert.equal(input.value, 'zzz');
  await type(React, input, '');
  await key(React, input, 'Escape');
  assert.equal(input.getAttribute('aria-expanded'), 'false');
});

// ── SortDropdown ────────────────────────────────────────────────────────────

test('SortDropdown: names the active sort, picks another, toggles direction', async () => {
  const onSortByChange = spy(), onSortOrderToggle = spy();
  const props = { sortBy: 'title', sortOrder: 'ASC', onSortByChange, onSortOrderToggle };
  const { container, rerender } = await render(React, h(C.SortDropdown, props));
  assert.match(text(container.querySelector('.sort-dropdown-trigger')), /ชื่อเรื่อง A–Z/);
  await click(React, container.querySelector('.sort-dropdown-trigger'));
  assert.ok(container.querySelector('.sort-dropdown-menu--open'));
  assert.ok(byText(container, 'ชื่อเรื่อง A–Z', '.sort-dropdown-item').classList.contains('sort-dropdown-item--active'));
  await click(React, byText(container, 'เล่มที่ยังขาด', '.sort-dropdown-item'));
  assert.deepEqual(onSortByChange.calls, ['missingCount']);
  assert.ok(!container.querySelector('.sort-dropdown-menu--open'));
  await click(React, container.querySelector('.sort-direction-btn'));
  assert.equal(onSortOrderToggle.calls.length, 1);
  await rerender(h(C.SortDropdown, { ...props, sortBy: 'nope', sortOrder: 'DESC' }));
  assert.match(text(container.querySelector('.sort-dropdown-trigger')), /อัปเดตล่าสุด/);
  assert.match(container.querySelector('.sort-direction-btn').title, /มากไปน้อย/);
});

// ── PublisherDropdown ───────────────────────────────────────────────────────

const menu = () => document.querySelector('.publisher-dropdown-menu');

test('PublisherDropdown: trigger label for none / one / several', async () => {
  for (const [selected, label] of [[[], 'ทุกสำนักพิมพ์'], ['all', 'ทุกสำนักพิมพ์'], ['P1', 'P1'], [['P1', 'P2'], '2 สำนักพิมพ์']]) {
    const v = await render(React, h(C.PublisherDropdown, { selectedPublisher: selected, onSelectPublisher: spy(), publisherOptions: ['P1', 'P2'] }));
    assert.equal(text(v.container.querySelector('.publisher-dropdown-trigger__label')), label);
  }
});

test('PublisherDropdown multi-select: toggle, select all, clear', async () => {
  const onSelect = spy();
  const { container } = await render(React, h(C.PublisherDropdown, { selectedPublisher: ['P1'], onSelectPublisher: onSelect, publisherOptions: ['P1', 'P2'], multiSelect: true }));
  await click(React, container.querySelector('.publisher-dropdown-trigger'));
  await click(React, byText(menu(), 'P2', '.publisher-dropdown-item'));
  await click(React, byText(menu(), 'P1', '.publisher-dropdown-item'));
  await click(React, byText(menu(), 'เลือกทั้งหมด (2)'));
  await click(React, byText(menu(), 'ล้างทั้งหมด'));
  assert.deepEqual(onSelect.calls, [['P1', 'P2'], [], ['P1', 'P2'], []]);
  assert.equal(text(menu().querySelector('.publisher-dropdown-footer span')), 'เลือกแล้ว 1/2');
  await click(React, byText(menu(), 'ตกลง'));
  assert.ok(!menu());
  await click(React, container.querySelector('.publisher-dropdown-clear'));
  assert.deepEqual(onSelect.calls.at(-1), []);
});

test('PublisherDropdown single-select: "all" option, pick closes the menu, clear means "all"', async () => {
  const onSelect = spy();
  const { container } = await render(React, h(C.PublisherDropdown, { selectedPublisher: 'P1', onSelectPublisher: onSelect, publisherOptions: ['P1', 'P2'] }));
  await click(React, container.querySelector('.publisher-dropdown-trigger'));
  await click(React, byText(menu(), 'P2', '.publisher-dropdown-item'));
  assert.ok(!menu());
  await click(React, container.querySelector('.publisher-dropdown-trigger'));
  await click(React, byText(menu(), 'ทุกสำนักพิมพ์', '.publisher-dropdown-item'));
  await click(React, container.querySelector('.publisher-dropdown-clear'));
  assert.deepEqual(onSelect.calls, ['P2', 'all', 'all']);
});

test('PublisherDropdown: search box appears past 5 publishers and filters them', async () => {
  const pubs = ['P1', 'P2', 'P3', 'P4', 'P5', 'Six'];
  const { container } = await render(React, h(C.PublisherDropdown, { selectedPublisher: [], onSelectPublisher: spy(), publisherOptions: pubs, multiSelect: true }));
  await click(React, container.querySelector('.publisher-dropdown-trigger'));
  const search = menu().querySelector('.publisher-dropdown-search-input');
  await type(React, search, 'six');
  assert.deepEqual([...menu().querySelectorAll('.publisher-dropdown-item')].map(text), ['Six']);
  await type(React, search, 'zz');
  assert.equal(text(menu().querySelector('.publisher-dropdown-empty')), 'ไม่พบสำนักพิมพ์ "zz"');
  await click(React, menu().querySelector('.publisher-dropdown-search-clear'));
  assert.equal(menu().querySelectorAll('.publisher-dropdown-item').length, 6);
  await click(React, document.body); // outside click closes
  assert.ok(!menu());
});

// ── CollectionLogSummary ────────────────────────────────────────────────────

test('CollectionLogSummary: one line per log state', async () => {
  const line = async log => {
    const { container } = await render(React, h(C.CollectionLogSummary, { log }));
    const pill = container.querySelector('.summary-status-pill');
    return [text(container.querySelector('strong')), text(pill), pill.className.replace('summary-status-pill ', '')];
  };
  assert.deepEqual(await line(owned(40, [[39, 39]], { isPartial: true })), ['เก็บบางเล่ม (เล่มปกติ):', '39', 'partial']);
  assert.deepEqual(await line(owned(null, [[1, 2]])), ['สะสม (เล่มปกติ):', 'ยังไม่ระบุจำนวนเล่มทั้งหมด', 'unknown']);
  assert.deepEqual(await line(owned(2, [[1, 2]])), ['สะสมครบ (เล่มปกติ):', 'ครบถ้วน', 'complete']);
  assert.deepEqual(await line(owned(3, [[1, 1]], { language: 'jp', title: 'X' })), ['ขาด (JP · X):', '2-3', 'missing']);
});

// ── Icons ───────────────────────────────────────────────────────────────────

test('Icons: every icon renders an svg; a star can be filled or half', async () => {
  for (const [name, Icon] of Object.entries(C.Icons)) {
    const { container } = await render(React, h(Icon));
    assert.ok(container.querySelector('svg'), name);
  }
  const half = await render(React, h(C.Icons.Star, { half: true }));
  const full = await render(React, h(C.Icons.Star, { filled: true }));
  assert.notEqual(half.container.innerHTML, full.container.innerHTML);
});

// ── RatingFilter ────────────────────────────────────────────────────────────

test('getRatingBadgeText', () => {
  assert.equal(C.getRatingBadgeText(4, 4, true), 'ยังไม่ให้คะแนน');
  assert.equal(C.getRatingBadgeText(3, 3), '★ 3.0 พอดี');
  assert.equal(C.getRatingBadgeText(3, 0), '★ 3.0+');
  assert.equal(C.getRatingBadgeText(3, 5), '★ 3.0+');
  assert.equal(C.getRatingBadgeText(2, 4), '★ 2.0 – 4.0');
  assert.equal(C.getRatingBadgeText(0, 4), '★ 0.0 – 4.0');
  assert.ok(!C.getRatingBadgeText(0, 0));
});

function RatingHarness({ log, initial = { minRating: 0, maxRating: 0, unratedOnly: false } }) {
  const [f, setF] = React.useState(initial);
  return h(C.RatingFilter, { ...f, onChange: p => { log.push(p); setF(p); } });
}
const ratingFilter = async initial => {
  const log = [];
  const view = await render(React, h(RatingHarness, { log, initial }));
  const c = view.container;
  return {
    log, c,
    star: n => click(React, c.querySelector(`[aria-label="เลือกดาว ${n}"]`)),
    tab: label => click(React, byText(c, label, '.rating-filter__mode-tab')),
    slide: (label, v) => type(React, c.querySelector(`[aria-label="${label}"]`), v),
    status: () => text(c.querySelector('.rating-filter__status-text')),
  };
};
const p = (minRating, maxRating, unratedOnly = false) => ({ minRating, maxRating, unratedOnly });

test('RatingFilter: "at least" stars and slider; clicking the active star clears', async () => {
  const r = await ratingFilter();
  assert.equal(r.status(), 'ทั้งหมด (0 - 5★)');
  await r.star(4);
  assert.equal(r.status(), '4.0+ ดาวขึ้นไป');
  await r.star(4);
  await r.slide('คะแนนขั้นต่ำ', '2.5');
  assert.deepEqual(r.log, [p(4, 0), p(0, 0), p(2.5, 0)]);
});

test('RatingFilter: "exact" mode; switching tabs alone never filters', async () => {
  const r = await ratingFilter();
  await r.tab('= พอดี');
  assert.deepEqual(r.log, []);
  await r.star(3);
  assert.equal(r.status(), '3.0 ดาวพอดี');
  await r.star(3);
  await r.slide('คะแนนพอดี', '1.5');
  assert.deepEqual(r.log, [p(3, 3), p(0, 0), p(1.5, 1.5)]);
});

test('RatingFilter: "range" mode sliders keep min ≤ max', async () => {
  const r = await ratingFilter();
  await r.tab('⇄ ช่วง');
  await r.slide('คะแนนอย่างน้อย', '2');
  await r.slide('คะแนนไม่เกิน', '4');
  assert.equal(r.status(), '2.0 ★ — 4.0 ★');
  await r.star(3);
  await r.slide('คะแนนไม่เกิน', '1');
  assert.deepEqual(r.log, [p(2, 0), p(2, 4), p(3, 4), p(1, 1)]);
});

test('RatingFilter: switching tabs re-applies an active rating; unrated toggle', async () => {
  const r = await ratingFilter(p(3, 0));
  await r.tab('= พอดี');
  await r.tab('⇄ ช่วง');
  await r.tab('≥ ขั้นต่ำ');
  assert.deepEqual(r.log, [p(3, 3), p(3, 5), p(3, 0)]);
  await click(React, byText(r.c, 'ยังไม่ให้คะแนน', '.rating-filter__unrated-chip'));
  assert.equal(r.status(), 'ยังไม่ให้คะแนน');
  await click(React, byText(r.c, 'ยังไม่ให้คะแนน', '.rating-filter__unrated-chip'));
  assert.deepEqual(r.log.slice(3), [p(0, 0, true), p(0, 0)]);
});

test('RatingFilter: hovering a star previews it', async () => {
  const r = await ratingFilter();
  await React.act(async () => r.c.querySelector('[aria-label="เลือกดาว 2"]').dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true })));
  assert.equal(r.status(), '2.0 ดาว');
  await React.act(async () => r.c.querySelector('[aria-label="เลือกดาว 5"]').dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true })));
  assert.equal(r.status(), '5.0 ดาวเต็ม');
});

// ── FilterSidebar ───────────────────────────────────────────────────────────

function SidebarHarness({ log, resets, initial, publishers = ['P1', 'P2'] }) {
  const [filter, setF] = React.useState({ ...EMPTY, ...initial });
  return h(C.FilterSidebar, {
    filter, publishers, activeCount: filter.type.length + (filter.search ? 1 : 0),
    setFilter: patch => { log.push(patch); setF(f => ({ ...f, ...patch })); },
    resetFilter: () => { resets.push(1); setF({ ...EMPTY }); },
  });
}
const sidebar = async (initial = {}, publishers) => {
  const log = [], resets = [];
  const view = await render(React, h(SidebarHarness, { log, resets, initial, publishers }));
  const section = title => [...view.container.querySelectorAll('.filter-section')]
    .find(s => text(s.querySelector('.filter-section__title-wrap')).startsWith(title));
  const chip = (title, label) => click(React, byText(section(title), label, '.filter-chip'));
  return { ...view, log, resets, section, chip };
};

test('FilterSidebar: chips toggle values in and out; "ทั้งหมด" clears the group', async () => {
  const s = await sidebar();
  await s.chip('ประเภท', 'Manga');
  await s.chip('ประเภท', 'Novel');
  assert.equal(s.section('ประเภท').querySelectorAll('.filter-chip--active').length, 2);
  await s.chip('ประเภท', 'Manga');
  await s.chip('ประเภท', 'ทั้งหมด');
  await s.chip('สถานะการตีพิมพ์', 'จบแล้ว');
  await s.chip('สถานะการอ่าน', 'สายดอง');
  await s.chip('สถานะการสะสม', 'เลิกตามแล้ว');
  await s.chip('ภาษาของเล่มที่มี', 'ญี่ปุ่น (JP)');
  assert.deepEqual(s.log, [
    { type: ['manga'] }, { type: ['manga', 'novel'] }, { type: ['novel'] }, { type: [] },
    { status: ['completed'] }, { readStatus: ['unread'] }, { collectStatus: ['stopped'] }, { language: ['jp'] },
  ]);
});

test('FilterSidebar: search is debounced, can be cleared, and follows an outside reset', async () => {
  const s = await sidebar();
  const input = s.container.querySelector('.filter-search-input');
  await type(React, input, 'abc');
  assert.deepEqual(s.log, []);
  await flush(React, 300);
  assert.deepEqual(s.log, [{ search: 'abc' }]);
  await click(React, s.container.querySelector('.filter-search-clear'));
  assert.deepEqual(s.log.at(-1), { search: '' });
  assert.equal(input.value, '');

  await type(React, input, 'xyz');
  await flush(React, 300);
  await click(React, byText(s.container, 'ล้างทั้งหมด')); // header reset (activeCount > 0)
  assert.equal(s.resets.length, 1);
  assert.equal(input.value, '');
});

test('FilterSidebar: years, publishers, rating badge with its clear button, collapsible sections', async () => {
  const s = await sidebar({ minRating: 3 });
  await type(React, s.container.querySelector('[aria-label="ปีที่พิมพ์ ตั้งแต่"]'), '2010');
  await type(React, s.container.querySelector('[aria-label="ปีที่พิมพ์ จนถึง"]'), '2020');
  await click(React, s.section('สำนักพิมพ์').querySelector('.publisher-dropdown-trigger'));
  await click(React, byText(menu(), 'P2', '.publisher-dropdown-item'));
  assert.equal(text(s.section('คะแนน').querySelector('.filter-rating-badge')), '★ 3.0+');
  await click(React, s.section('คะแนน').querySelector('.filter-section__clear-btn'));
  assert.deepEqual(s.log, [{ yearFrom: '2010' }, { yearTo: '2020' }, { publisher: ['P2'] }, { minRating: 0, maxRating: 0, unratedOnly: false }]);
  assert.ok(!s.section('คะแนน').querySelector('.filter-rating-badge'));

  const header = s.section('ประเภท').querySelector('.filter-section__header');
  assert.equal(header.getAttribute('aria-expanded'), 'true');
  await click(React, header);
  assert.equal(header.getAttribute('aria-expanded'), 'false');

  const noPubs = await sidebar({}, []);
  assert.ok(!noPubs.section('สำนักพิมพ์'));
});

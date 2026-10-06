// Series feature components: progress bars, cards, list rows, views, form pieces, MAL search.
import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  startVite, stopVite, installDom, render, cleanup, toastMessages, click, type, key, flush, byText, text,
  series, reading, owned,
} from './setup.mjs';

installDom();
const React = await import('react');
const { default: toast } = await import('react-hot-toast');
const h = React.createElement;

const C = {};
let store, api, Icons;
before(async () => {
  const load = await startVite();
  for (const name of ['AggregatedVolumeBar', 'ConfirmDeleteModal', 'LiveCardPreview', 'LogEditorBox', 'SeriesLogsSection',
    'SeriesBasicInfoCard', 'SeriesFormSidebar', 'MalSearchPanel', 'SeriesCard', 'SeriesListItem', 'SeriesGridView',
    'SeriesListView', 'MissingVolumeRow']) {
    Object.assign(C, await load(`/src/features/series/components/${name}.tsx`));
  }
  ({ Icons } = await load('/src/components/Icons.tsx'));
  ({ useSeriesStore: store } = await load('/src/store/useSeriesStore.ts'));
  ({ seriesApi: api } = await load('/src/api/seriesApi.ts'));
});
after(stopVite);

const calls = [];
const realFetch = globalThis.fetch;
beforeEach(() => {
  calls.length = 0;
  api.update = async (...a) => { calls.push(['update', ...a]); return { data: {} }; };
  api.delete = async (...a) => { calls.push(['delete', ...a]); return { data: {} }; };
  api.getAll = async () => ({ data: { data: [] } });
  api.getStats = async () => ({ data: null });
  api.getAuthors = async () => ({ data: [] });
  api.getPublishers = async () => ({ data: [] });
});
afterEach(async () => { await cleanup(); toast.remove(); globalThis.fetch = realFetch; });

const spy = () => { const fn = (...args) => { fn.calls.push(args.length > 1 ? args : args[0]); }; fn.calls = []; return fn; };
const pills = c => [...c.querySelectorAll('.summary-status-pill')].map(text);
const badges = c => [...c.querySelectorAll('.badge')].map(text);

// ── AggregatedVolumeBar ─────────────────────────────────────────────────────

const bar = async (logs, type = 'buy') => {
  const { container } = await render(React, h(C.AggregatedVolumeBar, { logs, type, icon: Icons.Cart, titleLabel: 'สะสม' }));
  const item = container.querySelector('.progress-item');
  return item && {
    label: text(item.querySelector('.progress-label')), percent: text(item.querySelector('.progress-percent')),
    full: item.classList.contains('progress-item--full'), cells: item.querySelectorAll('.vbar-mini-cell').length,
    filled: item.querySelectorAll(type === 'read' ? '.vbar-mini-cell.read' : '.vbar-mini-cell.bought').length,
    special: item.querySelectorAll('.vbar-mini-cell.special').length, gaps: item.querySelectorAll('.vbar-mini-gap').length,
  };
};

test('AggregatedVolumeBar: count, percent and one cell per volume', async () => {
  assert.deepEqual(await bar([reading('Main', 10, [[1, 3]])], 'read'),
    { label: 'สะสม: 3/10', percent: '30%', full: false, cells: 10, filled: 3, special: 0, gaps: 0 });
});

test('AggregatedVolumeBar: volumes past the total do not fill the bar (regression: showed 10/10, 100%)', async () => {
  const r = await bar([owned(10, [[1, 5], [11, 15]])]);
  assert.deepEqual([r.label, r.percent, r.full, r.filled], ['สะสม: 5/10', '50%', false, 5]);
});

test('AggregatedVolumeBar: only non-partial Thai logs; extra logs are marked special after a gap', async () => {
  const r = await bar([owned(2, [[1, 2]]), owned(3, [[1, 1]]), owned(3, [[1, 3]], { language: 'jp' }), owned(null, [[1, 1]], { isPartial: true })]);
  assert.deepEqual(r, { label: 'สะสม: 3/5', percent: '60%', full: false, cells: 5, filled: 3, special: 3, gaps: 1 });
  assert.deepEqual((await bar([owned(2, [[1, 2]])])).full, true);
  assert.deepEqual(await bar([owned(null, [[1, 4]])]), { label: 'สะสม: 4/?', percent: '0%', full: false, cells: 0, filled: 0, special: 0, gaps: 0 });
  assert.equal(await bar([owned(3, [[1, 3]], { language: 'jp' })]), null);
  assert.equal(await bar([]), null);
});

// ── ConfirmDeleteModal ──────────────────────────────────────────────────────

test('ConfirmDeleteModal: says what will be deleted and wires both buttons', async () => {
  const onConfirm = spy(), onClose = spy();
  const s = series([owned(10, [[1, 5]]), owned(1, [[1, 1]])], [reading('Main', 10, [[1, 3]]), reading('Zero', 1, [[1, 1]])], { title: 'Doomed' });
  const { container } = await render(React, h(C.ConfirmDeleteModal, { series: s, onConfirm, onClose }));
  assert.match(text(container), /"Doomed"/);
  assert.deepEqual([...container.querySelectorAll('li')].map(text), ['บันทึกการอ่าน 2 รายการ (4 เล่ม)', 'บันทึกการสะสม 2 รายการ (6 เล่ม)']);
  await click(React, byText(container, 'ลบถาวร'));
  await click(React, byText(container, 'ยกเลิก'));
  await click(React, container.querySelector('.modal__close'));
  assert.deepEqual([onConfirm.calls.length, onClose.calls.length], [1, 2]);
  const off = await render(React, h(C.ConfirmDeleteModal, { series: { ...s, isCollecting: false }, onConfirm, onClose }));
  assert.equal(off.container.querySelectorAll('li').length, 1);
});

// ── LiveCardPreview ─────────────────────────────────────────────────────────

const preview = (form, stats = { totalReadCount: 0, totalReadJP: 0 }) =>
  render(React, h(C.LiveCardPreview, { form: { readingLogs: [], collectionLogs: [], ...form }, stats }));

test('LiveCardPreview: placeholders for an empty form', async () => {
  const { container } = await preview({});
  assert.equal(text(container.querySelector('.card__title')), 'ชื่อเรื่องที่พิมพ์...');
  assert.equal(text(container.querySelector('.card__timeline-label')), '? – ปัจจุบัน');
  assert.match(text(container.querySelector('.card__author')), /^ผู้แต่ง/);
  assert.ok(container.querySelector('.card__cover-empty'));
  assert.deepEqual(badges(container), ['Manga', 'ยังไม่จบ']);
  assert.match(text(container.querySelector('.card__summary')), /อ่านแล้ว: เล่ม 0\/\?.*อ่านอย่างเดียว/);
});

test('LiveCardPreview: a filled form, cover served through the offline cache (regression)', async () => {
  const { container } = await preview({
    title: 'Frieren', author: 'Yamada', publisher: 'P', type: 'novel', status: 'completed', publishYear: 2020, endYear: '',
    imageUrl: 'https://cdn.example/c.jpg', isCollecting: true, rating: 4,
    collectionLogs: [owned(10, [[1, 5]]), owned(null, [])],
  }, { totalReadCount: 3, totalReadJP: 10 });
  assert.equal(container.querySelector('img.card__cover').getAttribute('src'), '/api/cover?url=https%3A%2F%2Fcdn.example%2Fc.jpg');
  assert.equal(text(container.querySelector('.card__timeline-label')), '2020 – จบแล้ว');
  assert.equal(text(container.querySelector('.card__author')), 'Yamada | P');
  assert.deepEqual(pills(container), ['6-10', 'ยังไม่ระบุจำนวนเล่มทั้งหมด']);
  assert.match(text(container.querySelector('.card__summary')), /อ่านแล้ว: เล่ม 3\/10/);
});

test('LiveCardPreview: stopped collection', async () => {
  const { container } = await preview({ isCollecting: true, isCollectingStopped: true, collectionLogs: [owned(10, [])] });
  assert.ok(badges(container).includes('เลิกตามแล้ว'));
  assert.deepEqual(pills(container), ['เลิกตามแล้ว']);
});

// ── LogEditorBox ────────────────────────────────────────────────────────────

const editor = async (log, type, showRemove = true) => {
  const onUpdate = spy(), onRemove = spy();
  const view = await render(React, h(C.LogEditorBox, { log, idx: 0, type, showRemove, onUpdate, onRemove }));
  return { ...view, onUpdate, onRemove };
};

test('LogEditorBox (reading): title, total, ranges, remove', async () => {
  const e = await editor(reading('Main', 10, [[1, 2]]), 'reading');
  const [title, total] = e.container.querySelectorAll('.field-row input');
  await type(React, title, 'ภาคต้น');
  await type(React, total, '12');
  const [start] = e.container.querySelectorAll('.range-inputs input');
  await type(React, start, '5');
  await click(React, byText(e.container, 'เพิ่ม'));
  await click(React, e.container.querySelector('[title="ลบชุดการอ่านนี้"]'));
  assert.deepEqual(e.onUpdate.calls, [['title', 'ภาคต้น'], ['totalVolumes', 12], ['ranges', [[1, 2], [5, 5]]]]);
  assert.equal(e.onRemove.calls.length, 1);
  assert.ok(!(await editor(reading('Main', 1, []), 'reading', false)).container.querySelector('[title="ลบชุดการอ่านนี้"]'));
});

test('LogEditorBox: a total that is not a whole number above 0 is stored as "unknown" (regression: save failed)', async () => {
  for (const kind of ['reading', 'collection']) {
    const e = await editor(kind === 'reading' ? reading('Main', 10, []) : owned(10, []), kind);
    const total = [...e.container.querySelectorAll('input[type="number"]')].find(i => i.closest('.field-row') && !i.closest('.range-inputs'));
    assert.equal(total.getAttribute('min'), '1');
    for (const raw of ['7', '2.5', '-3', '0', '']) await type(React, total, raw);
    assert.deepEqual(e.onUpdate.calls.map(c => c[1]), [7, null, null, null, null], kind);
  }
});

test('LogEditorBox (collection): format, language, partial', async () => {
  const e = await editor(owned(10, []), 'collection');
  const [formatTrigger, languageTrigger] = e.container.querySelectorAll('.dropdown-trigger');
  await click(React, formatTrigger);
  await click(React, byText(document.querySelector('[role="listbox"]'), 'E-Book'));
  await click(React, languageTrigger);
  await click(React, byText(document.querySelector('[role="listbox"]'), 'ญี่ปุ่น (JP)'));
  await click(React, e.container.querySelector('input[type="checkbox"]'));
  assert.deepEqual(e.onUpdate.calls, [['format', 'digital'], ['language', 'jp'], ['isPartial', true]]);
  const partial = await editor(owned(null, [], { isPartial: true }), 'collection');
  assert.ok(!byText(partial.container, 'มีทั้งหมด (เล่ม)', 'label'));
});

// ── SeriesLogsSection ───────────────────────────────────────────────────────

test('SeriesLogsSection: collapsed count, add, remove only when there is more than one log', async () => {
  const props = { type: 'reading', logs: [reading('A', 1, [])], isOpen: false, onToggleOpen: spy(), onAdd: spy(), onRemove: spy(), onUpdate: spy() };
  const { container, rerender } = await render(React, h(C.SeriesLogsSection, props));
  assert.match(text(container), /\(1 ชุด\)/);
  assert.equal(container.querySelectorAll('.log-editor-box').length, 0);
  await click(React, container.querySelector('.form-section-card__title-toggle'));
  await click(React, byText(container, '+ เพิ่มชุด/ภาคใหม่'));
  assert.deepEqual([props.onToggleOpen.calls.length, props.onAdd.calls.length], [1, 1]);

  await rerender(h(C.SeriesLogsSection, { ...props, isOpen: true }));
  assert.equal(container.querySelectorAll('.log-editor-box__remove').length, 0);
  await rerender(h(C.SeriesLogsSection, { ...props, isOpen: true, logs: [reading('A', 1, []), reading('B', 1, [])] }));
  await click(React, container.querySelectorAll('.log-editor-box__remove')[1]);
  await type(React, container.querySelectorAll('.log-editor-box')[1].querySelector('input'), 'B2');
  assert.deepEqual(props.onRemove.calls, [1]);
  assert.deepEqual(props.onUpdate.calls, [[1, 'title', 'B2']]);

  const coll = await render(React, h(C.SeriesLogsSection, { ...props, type: 'collection', logs: [owned(1, []), owned(2, [])] }));
  assert.match(text(coll.container), /\(2 รูปแบบ\).*\+ เพิ่มรูปแบบสะสม/);
});

// ── SeriesBasicInfoCard ─────────────────────────────────────────────────────

const basicForm = { title: 'T', imageUrl: '', author: '', publisher: '', type: 'manga', status: 'ongoing', publishYear: '', endYear: '', rating: 0 };
const basicCard = async (form = basicForm, fieldErrors = {}) => {
  const onFieldChange = spy(), onStatusChange = spy(), clearFieldError = spy();
  const view = await render(React, h(C.SeriesBasicInfoCard, {
    form, fieldErrors, authors: [{ name: 'Oda' }, { name: 'Odagiri' }], publishers: [{ name: 'Siam' }],
    titleInputRef: React.createRef(), onFieldChange, onStatusChange, clearFieldError,
  }));
  const field = name => view.container.querySelector(`[data-field="${name}"]`);
  return { ...view, onFieldChange, onStatusChange, clearFieldError, field };
};

test('SeriesBasicInfoCard: edits report a patch and clear that field\'s error', async () => {
  const b = await basicCard();
  await type(React, b.field('title'), 'New');
  await type(React, b.field('publishYear'), '2019');
  await type(React, b.field('author'), 'od');
  assert.deepEqual([...b.container.querySelectorAll('[role="option"]')].map(text), ['Oda', 'Odagiri']);
  await type(React, b.field('publisher'), 'Siam');
  await type(React, b.container.querySelectorAll('.input')[1], 'https://x/c.jpg');
  const [typeTrigger, statusTrigger] = b.container.querySelectorAll('.dropdown-trigger');
  await click(React, typeTrigger);
  await click(React, byText(document.querySelector('[role="listbox"]'), 'Novel (นิยาย)'));
  await click(React, statusTrigger);
  await click(React, byText(document.querySelector('[role="listbox"]'), 'จบแล้ว (Completed)'));
  await click(React, b.container.querySelector('[aria-label="ให้ 4 ดาว"]'));
  assert.deepEqual(b.onFieldChange.calls, [
    { title: 'New' }, { publishYear: '2019' }, { author: 'od' }, { publisher: 'Siam' }, { imageUrl: 'https://x/c.jpg' }, { type: 'novel' }, { rating: 4 },
  ]);
  assert.deepEqual(b.onStatusChange.calls, ['completed']);
  assert.deepEqual(b.clearFieldError.calls, ['title', 'publishYear', 'author', 'publisher']);
});

test('SeriesBasicInfoCard: errors are shown, end year only applies to finished series', async () => {
  const b = await basicCard(basicForm, { title: 'กรุณากรอกชื่อเรื่อง', endYear: 'ปีที่จบต้องไม่ก่อนปีที่พิมพ์' });
  assert.equal(b.field('title').getAttribute('aria-invalid'), 'true');
  assert.equal(text(b.container.querySelector('#title-error')), 'กรุณากรอกชื่อเรื่อง');
  assert.equal(text(b.container.querySelector('#endYear-error')), 'ปีที่จบต้องไม่ก่อนปีที่พิมพ์');
  assert.equal(b.field('endYear').disabled, true);
  for (const status of ['completed', 'cancelled']) {
    const done = await basicCard({ ...basicForm, status });
    assert.equal(done.field('endYear').disabled, false);
    await type(React, done.field('endYear'), '2024');
    assert.deepEqual(done.onFieldChange.calls, [{ endYear: '2024' }]);
  }
});

// ── SeriesFormSidebar + MalSearchPanel ──────────────────────────────────────

const sidebarForm = { title: 'Frieren', imageUrl: '', notes: 'old', type: 'manga', status: 'ongoing', publishYear: '', endYear: '', author: '', publisher: '', rating: 0, readingLogs: [], collectionLogs: [], isCollecting: true };

test('SeriesFormSidebar: notes and the MAL toggle', async () => {
  const onNotesChange = spy(), onToggleMal = spy();
  const props = { form: sidebarForm, stats: { totalReadCount: 0, totalReadJP: 0 }, malOpen: false, onToggleMal, onSelectMalItem: spy(), onNotesChange };
  const { container, rerender } = await render(React, h(C.SeriesFormSidebar, props));
  await type(React, container.querySelector('textarea'), 'new note');
  await click(React, container.querySelector('.checklist-publisher-header'));
  assert.deepEqual(onNotesChange.calls, ['new note']);
  assert.equal(onToggleMal.calls.length, 1);
  assert.ok(!container.querySelector('.sidebar-mal-panel'));
  await rerender(h(C.SeriesFormSidebar, { ...props, malOpen: true }));
  assert.ok(container.querySelector('.sidebar-mal-panel'));
  assert.ok(container.querySelector('.live-preview-section'));
});

const MAL_ITEM = {
  node: { id: 1, title: 'Sousou no Frieren', main_picture: { medium: 'https://m/1.jpg', large: 'https://l/1.jpg' }, status: 'finished', num_volumes: 12 },
};
const fakeFetch = (status, body) => {
  const seen = [];
  globalThis.fetch = async url => { seen.push(url); if (body instanceof Error) throw body; return { ok: status < 400, status, json: async () => body }; };
  return seen;
};
const malPanel = async (title, imageUrl = '') => {
  const onSelectMalItem = spy();
  const view = await render(React, h(C.MalSearchPanel, { title, imageUrl, onSelectMalItem }));
  const search = async () => { await click(React, byText(view.container, 'ดึงข้อมูลอัตโนมัติ')); await flush(React); };
  return { ...view, onSelectMalItem, search };
};

test('MalSearchPanel: needs a title of at least 3 characters before asking MAL', async () => {
  const seen = fakeFetch(200, { data: [] });
  await (await malPanel('  ')).search();
  await (await malPanel('ab')).search();
  assert.deepEqual(seen, []);
  assert.deepEqual(await toastMessages(React), ['error:MAL ค้นหาได้เมื่อชื่อเรื่องยาวอย่างน้อย 3 ตัวอักษร', 'error:กรุณากรอกชื่อเรื่องก่อนค้นหา']);
});

test('MalSearchPanel: lists results, marks the chosen cover, picks by click or keyboard, can be closed', async () => {
  const seen = fakeFetch(200, { data: [MAL_ITEM, { node: { id: 2, title: 'Other', status: 'currently_publishing' } }] });
  const m = await malPanel(' Frieren X ', 'https://l/1.jpg');
  await m.search();
  assert.deepEqual(seen, ['/api/mal/search?q=Frieren%20X']);
  const items = m.container.querySelectorAll('.sidebar-mal-item');
  assert.deepEqual([...items].map(i => text(i.querySelector('.sidebar-mal-item-sub'))), ['จบแล้ว • 12 เล่ม', 'กำลังลง']);
  assert.deepEqual([...items].map(i => i.getAttribute('aria-pressed')), ['true', 'false']);
  await click(React, items[1]);
  await key(React, items[0], 'Enter');
  assert.deepEqual(m.onSelectMalItem.calls.map(i => i.node.id), [2, 1]);
  assert.deepEqual(await toastMessages(React), ['success:พบข้อมูล 2 เรื่องใน MAL!']);
  await click(React, m.container.querySelector('[aria-label="ปิดกล่องค้นหา"]'));
  assert.equal(m.container.querySelectorAll('.sidebar-mal-item').length, 0);
});

test('MalSearchPanel: MAL failure, no results and a network error each say so', async () => {
  fakeFetch(400, { message: 'invalid q' });
  await (await malPanel('Frieren')).search();
  fakeFetch(200, { data: [] });
  await (await malPanel('Frieren')).search();
  fakeFetch(200, new Error('offline'));
  const m = await malPanel('Frieren');
  await m.search();
  assert.equal(byText(m.container, 'ดึงข้อมูลอัตโนมัติ').disabled, false);
  assert.deepEqual(await toastMessages(React), ['error:เกิดข้อผิดพลาดในการดึงข้อมูล', 'error:ไม่พบข้อมูลเรื่องนี้ในระบบ MAL', 'error:ค้นหา MAL ไม่สำเร็จ: invalid q']);
});

// ── SeriesCard ──────────────────────────────────────────────────────────────

const card = async s => (await render(React, h(C.SeriesCard, { series: s }))).container;

test('SeriesCard: reading and collection badges per state', async () => {
  const caughtUp = await card(series([owned(10, [[1, 5]])], [reading('Main', 10, [[1, 10]])]));
  assert.deepEqual(badges(caughtUp), ['Manga', 'ยังไม่จบ', 'ทันปัจจุบัน', 'ทั้งอ่านทั้งเก็บ']);
  assert.deepEqual(pills(caughtUp), ['6-10']);
  const finished = await card(series([owned(1, [[1, 1]])], [reading('Main', 1, [[1, 1]])], { status: 'completed' }));
  assert.deepEqual(badges(finished), ['Manga', 'จบแล้ว', 'อ่านจบแล้ว', 'ทั้งอ่านทั้งเก็บ']);
  assert.deepEqual(pills(finished), ['ครบถ้วน']);
  const readOnly = await card(series([owned(1, [])], [reading('Main', 3, [[1, 1]])], { isCollecting: false, isCollectingStopped: true }));
  assert.deepEqual(badges(readOnly), ['Manga', 'ยังไม่จบ', 'อ่านอย่างเดียว']);
  assert.ok(!readOnly.querySelector('.card__summary'));
  const unread = await card(series([owned(3, [])], [reading('Main', 3, [])]));
  assert.ok(badges(unread).includes('สายดอง'));
  const stopped = await card(series([owned(3, [])], [], { isCollectingStopped: true }));
  assert.ok(badges(stopped).includes('เลิกตามแล้ว'));
  assert.deepEqual(pills(stopped), ['เลิกตามแล้ว']);
});

test('SeriesCard: timeline, author line and cover', async () => {
  const line = async extra => {
    const c = await card(series([], [], extra));
    return text(c.querySelector('.card__timeline-label'));
  };
  assert.equal(await line({ status: 'completed', publishYear: 2001, endYear: 2005 }), '2001 – 2005');
  assert.equal(await line({ status: 'completed', publishYear: 2001 }), '2001 – จบแล้ว');
  assert.equal(await line({ publishYear: 2001 }), '2001 – ปัจจุบัน');
  assert.equal(await line({}), '? – ปัจจุบัน');
  const c = await card(series([], [], { author: '', publisher: '', imageUrl: 'https://x/y.png' }));
  assert.equal(text(c.querySelector('.card__author')), '?');
  assert.equal(c.querySelector('img').getAttribute('src'), '/api/cover?url=https%3A%2F%2Fx%2Fy.png');
  assert.ok((await card(series())).querySelector('.card__cover-empty'));
});

test('SeriesCard: rate, edit and delete', async () => {
  const c = await card(series([], [], { _id: '42', title: 'Rate me' }));
  await click(React, c.querySelector('[aria-label="ให้ 3 ดาว"]'));
  await click(React, c.querySelector('[title="แก้ไข"]'));
  assert.equal(text(document.querySelector('#series-modal-title')), 'แก้ไขข้อมูลเรื่อง: Rate me');
  await click(React, document.querySelector('.modal__close')); // not dirty: closes at once
  assert.ok(!document.querySelector('#series-modal-title'));
  await click(React, c.querySelector('[title="ลบ"]'));
  await click(React, byText(document, 'ลบถาวร'));
  await flush(React);
  assert.deepEqual(calls, [['update', '42', { rating: 3 }], ['delete', '42']]);
  assert.ok(!byText(document, 'ลบถาวร'));
});

// ── SeriesListItem ──────────────────────────────────────────────────────────

const row = async s => (await render(React, h(C.SeriesListItem, { series: s }))).container;
const missingLine = c => {
  const p = c.querySelector('.list-row__missing');
  return p && [p.className.replace('list-row__missing list-row__missing--', ''), text(p).replace(/⁠/g, '')];
};

test('SeriesListItem: the missing line leads with a missing log, then complete, unknown, partial', async () => {
  let c = await row(series([owned(2, [[1, 2]]), owned(3, [[1, 1]], { language: 'jp' })]));
  assert.deepEqual(missingLine(c), ['missing', 'ขาด (JP · เล่มปกติ) 2-3']);
  await click(React, byText(c, '+1 รูปแบบ'));
  assert.ok(document.querySelector('#series-modal-title'));
  assert.deepEqual(missingLine(await row(series([owned(2, [[1, 2]]), owned(null, [])]))), ['complete', 'ครบถ้วน']);
  assert.deepEqual(missingLine(await row(series([owned(null, [[1, 2]])]))), ['unknown', 'ยังไม่ระบุจำนวนเล่มทั้งหมด']);
  assert.deepEqual(missingLine(await row(series([owned(null, [[39, 39]], { isPartial: true })]))), ['partial', 'เก็บบางเล่ม (เล่มปกติ) 39']);
});

test('SeriesListItem: badges sit under the bar they describe; stopped and read-only have no missing line', async () => {
  const stopped = await row(series([owned(10, [[1, 2]])], [reading('Main', 10, [])], { isCollectingStopped: true }));
  assert.equal(missingLine(stopped), null);
  assert.deepEqual([...stopped.querySelectorAll('.list-row__collect .badge')].map(text), ['เลิกตามแล้ว']);
  assert.deepEqual([...stopped.querySelectorAll('.list-row__read .badge')].map(text), ['สายดอง']);
  const readOnly = await row(series([], [reading('Main', 2, [[1, 2]])], { isCollecting: false, status: 'completed', publishYear: 2001 }));
  assert.equal(missingLine(readOnly), null);
  assert.deepEqual([...readOnly.querySelectorAll('.list-row__collect .badge')].map(text), ['อ่านอย่างเดียว']);
  assert.equal(text(readOnly.querySelector('.list-row__timeline')), '2001 – ?');
  const caughtUp = await row(series([], [reading('Main', 2, [[1, 2]])]));
  assert.deepEqual([...caughtUp.querySelectorAll('.list-row__read .badge')].map(text), ['ทันปัจจุบัน']);
});

test('SeriesListItem: rate and delete', async () => {
  const c = await row(series([], [], { _id: '7', imageUrl: 'https://x/y.png' }));
  assert.equal(c.querySelector('img').getAttribute('src'), '/api/cover?url=https%3A%2F%2Fx%2Fy.png');
  await click(React, c.querySelector('[aria-label="ให้ 5 ดาว"]'));
  await click(React, c.querySelector('[title="ลบ"]'));
  await click(React, byText(document, 'ลบถาวร'));
  await flush(React);
  assert.deepEqual(calls, [['update', '7', { rating: 5 }], ['delete', '7']]);
  await click(React, c.querySelector('[title="แก้ไข"]'));
  assert.ok(document.querySelector('#series-modal-title'));
});

// ── Grid / list views ───────────────────────────────────────────────────────

test('Grid and list views: empty states, with and without an active filter', async () => {
  for (const View of [C.SeriesGridView, C.SeriesListView]) {
    const onResetFilter = spy();
    const props = { displaySeries: [], activeFilterCount: 0, onResetFilter, sortBy: 'title', sortOrder: 'ASC', onSortChange: spy() };
    const empty = await render(React, h(View, props));
    assert.match(text(empty.container), /ยังไม่มีเรื่องในคอลเลกชัน/);
    assert.ok(!byText(empty.container, 'ล้างตัวกรองทั้งหมด'));
    const none = await render(React, h(View, { ...props, activeFilterCount: 2 }));
    assert.match(text(none.container), /ไม่พบผลลัพธ์ที่ตรงกัน/);
    await click(React, byText(none.container, 'ล้างตัวกรองทั้งหมด'));
    assert.equal(onResetFilter.calls.length, 1);
  }
});

test('Grid and list views: one card / row per series', async () => {
  const list = [series([], [], { _id: 'a' }), series([], [], { _id: 'b' })];
  const grid = await render(React, h(C.SeriesGridView, { displaySeries: list, activeFilterCount: 0, onResetFilter: spy() }));
  assert.equal(grid.container.querySelectorAll('.card').length, 2);
  const rows = await render(React, h(C.SeriesListView, { displaySeries: list, activeFilterCount: 0, onResetFilter: spy(), sortBy: 'title', sortOrder: 'ASC', onSortChange: spy() }));
  assert.equal(rows.container.querySelectorAll('.list-row').length, 2);
});

test('List view headers: the active column flips direction, another column starts at its default', async () => {
  const onSortChange = spy();
  const { container } = await render(React, h(C.SeriesListView, {
    displaySeries: [series()], activeFilterCount: 0, onResetFilter: spy(), sortBy: 'title', sortOrder: 'ASC', onSortChange,
  }));
  const col = label => byText(container, label, '.list-header-col--sortable');
  assert.equal(col('ชื่อเรื่อง').getAttribute('aria-pressed'), 'true');
  assert.match(text(col('ชื่อเรื่อง')), /▲/);
  for (const label of ['ชื่อเรื่อง', 'การอ่าน', 'การสะสม & เล่มขาด', 'คะแนน']) await click(React, col(label));
  assert.deepEqual(onSortChange.calls, [['title', 'DESC'], ['readProgress', 'DESC'], ['missingCount', 'DESC'], ['rating', 'DESC']]);
});

// ── MissingVolumeRow ────────────────────────────────────────────────────────

test('MissingVolumeRow: shows the gap, hides the default format name and empty fields, wires its buttons', async () => {
  const props = {
    item: { _id: '1', title: 'One', author: '', publisher: 'ไม่ระบุสำนักพิมพ์', typeStr: 'Manga', rawType: 'manga', formats: [], rawSeries: series() },
    f: { id: 'c', title: 'เล่มปกติ', missingText: '3-4', missingCount: 2 }, isChecked: false,
    onToggleCheck: spy(), onEdit: spy(), onCopySingle: spy(),
  };
  const { container, rerender } = await render(React, h(C.MissingVolumeRow, props));
  assert.equal(text(container.querySelector('.checklist-item-missing-col')), 'เล่ม 3-4');
  assert.equal(text(container.querySelector('.checklist-item-author-col')), '-');
  assert.equal(text(container.querySelector('.checklist-item-publisher-col')), '-');
  await click(React, container.querySelector('[role="checkbox"]'));
  await click(React, container.querySelector('.checklist-row-btn--edit'));
  await click(React, container.querySelector('.checklist-row-btn--copy'));
  assert.deepEqual([props.onToggleCheck.calls.length, props.onEdit.calls.length, props.onCopySingle.calls.length], [1, 1, 1]);
  await rerender(h(C.MissingVolumeRow, { ...props, isChecked: true, f: { ...props.f, title: 'JP · X' } }));
  assert.equal(container.querySelector('[role="checkbox"]').getAttribute('aria-checked'), 'true');
  assert.equal(text(container.querySelector('.checklist-item-format')), 'JP · X');
});

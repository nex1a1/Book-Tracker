// The dialogs (add/edit series, missing-volume checklist, CSV export) and the App shell, in jsdom.
import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  startVite, stopVite, installDom, render, cleanup, toastMessages, click, type, key, flush, byText, text,
  series, reading, owned,
} from './setup.mjs';

const window = installDom();
const React = await import('react');
const { default: toast } = await import('react-hot-toast');
const h = React.createElement;

let store, api, EMPTY, SeriesInfoModal, MissingVolumesModal, ExportCsvModal, CSV_COLUMNS, App;
before(async () => {
  const load = await startVite();
  ({ useSeriesStore: store, EMPTY_FILTER: EMPTY } = await load('/src/store/useSeriesStore.ts'));
  ({ seriesApi: api } = await load('/src/api/seriesApi.ts'));
  ({ SeriesInfoModal } = await load('/src/features/series/components/SeriesInfoModal.tsx'));
  ({ MissingVolumesModal } = await load('/src/features/series/components/MissingVolumesModal.tsx'));
  ({ ExportCsvModal } = await load('/src/features/series/components/ExportCsvModal.tsx'));
  ({ CSV_COLUMNS } = await load('/src/utils/csvHelper.ts'));
  ({ default: App } = await load('/src/App.tsx'));
});
after(stopVite);

const calls = [];
const realFetch = globalThis.fetch;
let copied;
beforeEach(() => {
  calls.length = 0;
  copied = [];
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: async t => { copied.push(t); } }, configurable: true });
  api.create = async body => { calls.push(['create', body]); return { data: {} }; };
  api.update = async (id, body) => { calls.push(['update', id, body]); return { data: {} }; };
  api.delete = async id => { calls.push(['delete', id]); return { data: {} }; };
  api.getAll = async () => { calls.push(['getAll']); return { data: { data: store.getState().series } }; };
  api.getStats = async () => ({ data: store.getState().stats });
  api.getAuthors = async () => ({ data: [{ id: 1, name: 'Oda' }] });
  api.getPublishers = async () => ({ data: [{ id: 1, name: 'Siam' }] });
  store.setState({ series: [], stats: null, loading: false, viewMode: 'grid', authors: [{ id: 1, name: 'Oda' }], publishers: [{ id: 1, name: 'Siam' }], filter: { ...EMPTY, limit: 1000 } });
  localStorage.clear();
});
afterEach(async () => { await cleanup(); toast.remove(); globalThis.fetch = realFetch; });

const spy = () => { const fn = (...args) => { fn.calls.push(args); }; fn.calls = []; return fn; };
const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];
const pick = async (trigger, label) => { await click(React, trigger); await click(React, byText($('[role="listbox"]'), label)); };
const withoutIds = logs => logs.map(({ id, ...rest }) => rest);

// ── SeriesInfoModal ─────────────────────────────────────────────────────────

const field = name => $(`.modal [data-field="${name}"]`);
const saveBtn = () => byText(document, 'บันทึกข้อมูลซีรีส์ทั้งหมด') ?? byText(document, 'กำลังบันทึก...');
const save = async () => { await click(React, saveBtn()); await flush(React); };
const statusTrigger = () => $$('.modal .form-section-card')[0].querySelectorAll('.dropdown-trigger')[1];
const openModal = async (props = {}) => {
  const onClose = spy();
  await render(React, h(SeriesInfoModal, { onClose, ...props }));
  return onClose;
};
const fillBasics = async (year = '2019') => {
  await type(React, field('title'), 'New');
  await type(React, field('author'), 'Oda');
  await type(React, field('publisher'), 'Siam');
  await type(React, field('publishYear'), year);
};

test('SeriesInfoModal: required fields are highlighted and nothing is saved', async () => {
  await openModal();
  assert.equal(text($('#series-modal-title')), 'เพิ่มเรื่องใหม่เข้าระบบ');
  await save();
  assert.deepEqual(['title', 'author', 'publisher', 'publishYear'].map(k => $(`#${k}-error`) && text($(`#${k}-error`))),
    ['กรุณากรอกชื่อเรื่อง', 'กรุณากรอกผู้แต่ง', 'กรุณากรอกสำนักพิมพ์', 'กรุณากรอกปีที่พิมพ์']);
  assert.deepEqual(await toastMessages(React), ['error:กรุณากรอกข้อมูลให้ครบถ้วน (4 ช่องที่ไฮไลต์)']);
  await type(React, field('title'), 'x');
  assert.ok(!$('#title-error'));
  assert.deepEqual(calls, []);
});

test('SeriesInfoModal: years must be whole and the end cannot come before the start (regression: server 400)', async () => {
  await openModal();
  await fillBasics('2019.5');
  await save();
  assert.equal(text($('#publishYear-error')), 'ปีที่พิมพ์ต้องเป็นปี ค.ศ. เต็มจำนวน');
  await type(React, field('publishYear'), '2019');
  await pick(statusTrigger(), 'จบแล้ว (Completed)');
  for (const [endYear, message] of [['', 'กรุณากรอกปีที่จบ'], ['-5', 'ปีที่จบต้องเป็นปี ค.ศ. เต็มจำนวน'], ['2010', 'ปีที่จบต้องไม่ก่อนปีที่พิมพ์']]) {
    await type(React, field('endYear'), endYear);
    await save();
    assert.equal(text($('#endYear-error')), message, endYear);
  }
  assert.deepEqual(calls, []);
  await type(React, field('endYear'), '2019');
  await save();
  assert.equal(calls[0][0], 'create');
  assert.deepEqual([calls[0][1].status, calls[0][1].publishYear, calls[0][1].endYear], ['completed', 2019, 2019]);
});

test('SeriesInfoModal: creating sends a clean payload, refreshes and closes', async () => {
  const onClose = await openModal();
  await fillBasics();
  await click(React, byText(document, 'บันทึกความคืบหน้าการอ่าน', '.form-section-card__title-toggle'));
  await type(React, $('.log-editor-box:not(.log-editor-box--alt) .field-row input[type="number"]'), '12');
  await save();
  const [kind, body] = calls[0];
  assert.equal(kind, 'create');
  assert.deepEqual({ ...body, readingLogs: withoutIds(body.readingLogs), collectionLogs: withoutIds(body.collectionLogs) }, {
    title: 'New', author: 'Oda', publisher: 'Siam', publishYear: 2019, endYear: null, type: 'manga', status: 'ongoing',
    isCollecting: true, isCollectingStopped: false, rating: 0, imageUrl: '', notes: '',
    readingLogs: [{ title: 'ภาคหลัก', totalVolumes: 12, ranges: [] }],
    collectionLogs: [{ format: 'normal', title: 'เล่มปกติ', totalVolumes: null, ranges: [] }],
  });
  assert.deepEqual(calls.slice(1), [['getAll']]);
  assert.equal(onClose.calls.length, 1);
  assert.deepEqual(await toastMessages(React), ['success:บันทึกสำเร็จ']);
});

test('SeriesInfoModal: a rejected save shows the server reason and lets the user retry', async () => {
  api.create = async () => { throw { isAxiosError: true, response: { data: { error: 'ข้อมูลไม่ถูกต้อง', details: [{ path: 'title', message: 'bad' }] } } }; };
  const onClose = await openModal();
  await fillBasics();
  await save();
  assert.deepEqual(await toastMessages(React), ['error:เกิดข้อผิดพลาดในการบันทึก: bad (title)']);
  assert.equal(saveBtn().disabled, false);
  assert.equal(onClose.calls.length, 0);
});

const EDITED = series([owned(10, [[1, 3]], { id: '55', title: 'เล่มปกติ' })], [reading('Main', 10, [[1, 2]])],
  { _id: '9', id: 9, title: 'Old', author: 'Oda', publisher: 'Siam', status: 'completed', publishYear: 2001, endYear: 2005, rating: 3 });

test('SeriesInfoModal (edit): saves to the same series and keeps collection log ids', async () => {
  await openModal({ series: EDITED });
  assert.equal(text($('#series-modal-title')), 'แก้ไขข้อมูลเรื่อง: Old');
  assert.equal($$('.modal .log-editor-box').length, 2); // sections start open when editing
  await save();
  const [kind, id, body] = calls[0];
  assert.deepEqual([kind, id, body.collectionLogs[0].id, body.endYear, body.rating], ['update', '9', '55', 2005, 3]);
});

test('SeriesInfoModal (edit): a running status clears the end year; format renames a default title only', async () => {
  await openModal({ series: EDITED });
  await pick(statusTrigger(), 'ยังไม่จบ (Ongoing)');
  assert.equal(field('endYear').value, '');
  assert.equal(field('endYear').disabled, true);

  const box = () => $('.modal .log-editor-box--alt');
  const title = () => box().querySelector('.field-row input.input');
  await pick(box().querySelector('.dropdown-trigger'), 'Bigbook');
  assert.equal(title().value, 'Bigbook');
  await type(React, title(), 'Special');
  await pick(box().querySelector('.dropdown-trigger'), 'E-Book');
  assert.equal(title().value, 'Special');
  await save();
  assert.deepEqual([calls[0][2].status, calls[0][2].endYear, calls[0][2].collectionLogs[0].format], ['ongoing', null, 'digital']);
});

test('SeriesInfoModal (edit): logs can be added and removed; collecting can be stopped or switched off', async () => {
  await openModal({ series: EDITED });
  await click(React, byText(document, '+ เพิ่มชุด/ภาคใหม่'));
  assert.equal($$('.modal .log-editor-box:not(.log-editor-box--alt)').length, 2);
  await click(React, $$('.modal .log-editor-box__remove')[0]);
  assert.equal($$('.modal .log-editor-box:not(.log-editor-box--alt)').length, 1);
  await click(React, byText(document, '+ เพิ่มรูปแบบสะสม'));
  assert.equal($$('.modal .log-editor-box--alt').length, 2);

  await click(React, byText(document, 'เลิกตามแล้ว (ดรอป', '.buying-status-pill'));
  assert.equal(byText(document, 'เลิกตามแล้ว (ดรอป', '.buying-status-pill').getAttribute('aria-checked'), 'true');
  assert.ok($$('.live-preview-section .badge').some(b => text(b) === 'เลิกตามแล้ว'));
  await click(React, $('.modal .switch-toggle input'));
  assert.ok(!$('.buying-status-control'));
  await save();
  assert.deepEqual([calls[0][2].isCollecting, calls[0][2].isCollectingStopped, calls[0][2].readingLogs.length, calls[0][2].collectionLogs.length],
    [false, true, 1, 2]);
});

test('SeriesInfoModal: closing with unsaved changes asks first; Escape backs out of that question', async () => {
  const onClose = await openModal();
  await key(React, document, 'Escape');
  assert.equal(onClose.calls.length, 1); // nothing typed yet: closes at once
  await cleanup();

  const onClose2 = await openModal();
  await type(React, $$('[data-field="title"]').at(-1), 'draft');
  await click(React, $$('.modal__close').at(-1));
  assert.match(text($('#discard-confirm-title')), /ทิ้งการเปลี่ยนแปลง/);
  await key(React, document, 'Escape');
  assert.ok(!$('#discard-confirm-title'));
  await click(React, $$('.modal__close').at(-1));
  await click(React, byText(document, 'กลับไปแก้ไขต่อ'));
  assert.ok(!$('#discard-confirm-title'));
  await click(React, byText(document, 'ยกเลิก', '.modal__footer button'));
  await click(React, byText(document, 'ทิ้งการเปลี่ยนแปลง', '.btn--danger'));
  assert.equal(onClose2.calls.length, 1);
});

test('SeriesInfoModal: warns when adding something already in the library', async () => {
  store.setState({ series: [series([], [], { title: 'Dup', imageUrl: 'https://c/1.jpg' })] });
  await openModal();
  assert.ok(!$('.duplicate-warning'));
  await type(React, field('title'), '  dup ');
  assert.match(text($('.duplicate-warning')), /"Dup"/);
  await type(React, field('title'), 'Other');
  await type(React, $('.modal input[placeholder^="วาง URL"]'), 'https://c/1.jpg');
  assert.ok($('.duplicate-warning'));
  await cleanup();
  await openModal({ series: { ...EDITED, title: 'Dup' } });
  assert.ok(!$('.duplicate-warning'));
});

test('SeriesInfoModal: picking a MAL result fills the form; a running series drops the old end year (regression)', async () => {
  const node = (id, extra) => ({ node: { id, title: `M${id}`, main_picture: { large: `https://l/${id}.jpg` }, ...extra } });
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ data: [
    node(1, { status: 'finished', num_volumes: 12, start_date: '2020-04-28', end_date: '2024-01-01',
      authors: [{ node: { id: 1, first_name: 'Kanehito', last_name: 'Yamada' }, role: 'Story' }, { node: { id: 2, first_name: '', last_name: 'Abe' }, role: 'Art' }] }),
    node(2, { status: 'on_hiatus' }),
    node(3, { status: 'discontinued' }),
    node(4, { status: 'currently_publishing' }),
  ] }) });
  await openModal();
  await click(React, byText(document, 'ค้นหาจาก MyAnimeList'));
  await type(React, field('title'), 'Frieren');
  await click(React, byText(document, '🔍 ดึงข้อมูลอัตโนมัติ'));
  await flush(React);
  const choose = n => click(React, $(`[aria-label="เลือกข้อมูลจาก MAL: M${n}"]`));

  await choose(1);
  assert.deepEqual([field('author').value, field('publishYear').value, text(statusTrigger()), field('endYear').value, $('.modal input[placeholder^="วาง URL"]').value],
    ['Kanehito Yamada, Abe', '2020', 'จบแล้ว (Completed)', '2024', 'https://l/1.jpg']);
  await choose(2);
  assert.deepEqual([text(statusTrigger()), field('endYear').value], ['หยุดตีพิมพ์ชั่วคราว (On Hiatus)', '']);
  await choose(3);
  assert.equal(text(statusTrigger()), 'โดนตัดจบ (Cancelled)');
  await choose(4);
  assert.equal(text(statusTrigger()), 'ยังไม่จบ (Ongoing)');
  await choose(1);
  assert.equal(field('author').value, 'Kanehito Yamada, Abe');

  await type(React, field('publisher'), 'Siam');
  await save();
  const body = calls[0][1];
  assert.deepEqual([body.readingLogs[0].totalVolumes, body.collectionLogs[0].totalVolumes, body.endYear, body.imageUrl], [12, 12, 2024, 'https://l/1.jpg']);
});

// ── MissingVolumesModal ─────────────────────────────────────────────────────

const MA = series([owned(10, [[1, 5]], { id: 'ma' })], [], { _id: 'MA', title: 'Alpha', author: 'Au', publisher: 'P1' });
const MB = series([owned(3, [[1, 1]], { id: 'mb1' }), owned(2, [], { id: 'mb2', language: 'jp', title: 'Box' })], [],
  { _id: 'MB', title: 'Beta', author: '', publisher: 'P2', type: 'novel' });
const DONE = series([owned(1, [[1, 1]])], [], { _id: 'DONE', title: 'Done', publisher: 'P1' });

const openChecklist = async () => {
  const onClose = spy();
  await render(React, h(MissingVolumesModal, { onClose }));
  return onClose;
};
const pill = () => text($('.checklist-stats-bar__pills'));

test('MissingVolumesModal: grouped by publisher with totals; groups collapse; flat list view', async () => {
  store.setState({ series: [MA, MB, DONE] });
  await openChecklist();
  assert.match(pill(), /ขาดทั้งหมด 2 เรื่อง \(9 เล่ม\)/);
  assert.deepEqual($$('.checklist-publisher-header').map(el => [text(el.querySelector('.checklist-publisher-title')), text(el.querySelector('.checklist-publisher-count'))]),
    [['P1', '1 เรื่อง (5 เล่ม)'], ['P2', '1 เรื่อง (4 เล่ม)']]);
  assert.deepEqual($$('.checklist-item-missing-col').map(text), ['เล่ม 6-10', 'เล่ม 2-3', 'JP · Boxเล่ม 1-2']);
  await click(React, $$('.checklist-publisher-header')[0]);
  assert.equal($$('.checklist-item-row').length, 2);
  await click(React, byText(document, 'รายการยาว'));
  assert.equal($$('.checklist-item-row').length, 3);
});

test('MissingVolumesModal: ticking, copying what is left, copying one series', async () => {
  store.setState({ series: [MA, MB] });
  await openChecklist();
  assert.match(text(byText(document, 'คัดลอกข้อความ')), /\(9 เล่มที่เหลือ\)/);
  await click(React, byText(document, 'คัดลอกข้อความ'));
  assert.equal(copied[0], '📚 เช็กลิสต์หนังสือที่ต้องตามเก็บ\n\n1. Alpha\n   (แต่ง: Au | สนพ: P1)\n   👉 ขาด (เล่มปกติ): เล่ม 6-10\n\n'
    + '2. Beta\n   (สนพ: P2)\n   👉 ขาด (เล่มปกติ): เล่ม 2-3\n   👉 ขาด (JP · Box): เล่ม 1-2');

  await click(React, $('.checklist-item-row [role="checkbox"]'));
  assert.match(pill(), /หยิบแล้ว 5 เล่ม \(1 รายการ\)/);
  await click(React, byText(document, 'คัดลอกข้อความ'));
  assert.match(copied[1], /^📚 เช็กลิสต์หนังสือที่ต้องตามเก็บ\n\n1\. Beta\n/);

  await click(React, $$('.checklist-row-btn--copy')[1]);
  assert.equal(copied[2], '📚 Beta\n(สนพ: P2)\n👉 ขาด (เล่มปกติ): เล่ม 2-3\n👉 ขาด (JP · Box): เล่ม 1-2');

  for (const box of $$('.checklist-item-row [role="checkbox"]').slice(1)) await click(React, box);
  await click(React, byText(document, 'คัดลอกข้อความ'));
  assert.equal(copied.length, 3);
  await click(React, byText(document, 'ล้างรายการที่หยิบ'));
  assert.doesNotMatch(pill(), /หยิบแล้ว/);
  assert.deepEqual((await toastMessages(React)).slice(0, 2), ['error:ไม่มีรายการที่ยังไม่เช็กเหลืออยู่ให้คัดลอก', 'success:คัดลอก "Beta" แล้ว!']);
});

test('MissingVolumesModal: copy says so when the clipboard is unavailable', async () => {
  store.setState({ series: [MA] });
  Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
  await openChecklist();
  await click(React, byText(document, 'คัดลอกข้อความ'));
  await click(React, $('.checklist-row-btn--copy'));
  assert.deepEqual(await toastMessages(React), ['error:ไม่สามารถคัดลอกได้', 'error:ไม่สามารถคัดลอกได้']);
});

test('MissingVolumesModal: search; clearing the publisher filter is "no filter" again (regression)', async () => {
  store.setState({ series: [MA, MB] });
  await openChecklist();
  await type(React, $('.checklist-search-input'), 'zzz');
  assert.match(text($('.checklist-body')), /ไม่พบผลลัพธ์/);
  await type(React, $('.checklist-search-input'), '');

  await click(React, $('.modal .publisher-dropdown-trigger'));
  await click(React, byText($('.publisher-dropdown-menu'), 'P1', '.publisher-dropdown-item'));
  assert.equal($$('.checklist-item-row').length, 1);
  // everything gets bought while the checklist is open, the P1 filter still on
  await React.act(async () => store.setState({ series: [DONE] }));
  assert.match(text($('.checklist-body')), /ไม่พบผลลัพธ์/);
  await click(React, $('.modal .publisher-dropdown-clear'));
  assert.match(text($('.checklist-body')), /ครบถ้วนสมบูรณ์!/);
});

test('MissingVolumesModal: edit opens the series form; both close buttons close', async () => {
  store.setState({ series: [MA] });
  const onClose = await openChecklist();
  await click(React, $('.checklist-row-btn--edit'));
  assert.equal(text($('#series-modal-title')), 'แก้ไขข้อมูลเรื่อง: Alpha');
  await click(React, $$('.modal__close').at(-1));
  assert.ok(!$('#series-modal-title'));
  await click(React, byText(document, 'ปิดเช็กลิสต์'));
  await click(React, $('.modal__close'));
  assert.equal(onClose.calls.length, 2);
});

// ── ExportCsvModal ──────────────────────────────────────────────────────────

const X1 = series([owned(1, [])], [], { _id: 'x1', id: 1, title: 'Alpha', type: 'novel' });
const X2 = series([owned(1, []), owned(2, [])], [], { _id: 'x2', id: 2, title: 'Beta' });
const X3 = series([owned(1, [])], [], { _id: 'x3', id: 3, title: 'Gamma' });
const DEFAULT_COLS = CSV_COLUMNS => CSV_COLUMNS.filter(c => c.defaultSelected).length;

const openExport = async (props = {}) => {
  const onClose = spy();
  await render(React, h(ExportCsvModal, { onClose, allSeries: [X1, X2, X3], filteredSeries: [X3], hasActiveFilter: true, ...props }));
  return onClose;
};
const exportRows = () => $$('.preview-table tbody tr').map(tr => text(tr.querySelectorAll('td')[2]));
const scopeBadges = () => $$('.scope-pill__badge').map(text);
const headers = () => $$('.preview-table thead th').slice(1).map(text);

test('ExportCsvModal: scope starts on the main filter; the filtered badge keeps its own count (regression)', async () => {
  await openExport();
  assert.deepEqual(exportRows(), ['Gamma']);
  assert.deepEqual(scopeBadges(), ['1', '3']);
  await click(React, byText(document, 'รายการทั้งหมด'));
  assert.deepEqual(exportRows(), ['Alpha', 'Beta', 'Gamma']);
  assert.deepEqual(scopeBadges(), ['1', '3']);
  assert.match(text($('.export-summary-text')), new RegExp(`พร้อมส่งออก 3 แถว CSV \\(3 เรื่อง\\) \\| ${DEFAULT_COLS(CSV_COLUMNS)} คอลัมน์`));
  await click(React, byText(document, 'แตกแถวย่อยตามภาค'));
  assert.equal(exportRows().length, 4);
  await cleanup();
  await openExport({ hasActiveFilter: false });
  assert.equal(exportRows().length, 3);
});

test('ExportCsvModal: its own filter narrows the export, and reset falls back to the main filter', async () => {
  await openExport();
  await click(React, byText(document, 'ตัวกรองซีรีส์'));
  await click(React, byText($('.filter-data-popover'), 'Novel', '.mini-pill'));
  assert.deepEqual(exportRows(), ['Alpha']);
  assert.match(text($('.filter-data-popover .popover-footer')), /กรองได้ 1 เรื่อง/);
  await type(React, $('.filter-data-popover input.input-text'), 'zzz');
  assert.match(text($('.preview-empty')), /ไม่พบรายการซีรีส์ตามขอบเขตที่เลือก/);
  assert.equal(byText(document, 'ดาวน์โหลดไฟล์ CSV').disabled, true);
  await click(React, byText($('.filter-data-popover'), 'ล้างตัวกรอง (2)'));
  assert.deepEqual(exportRows(), ['Gamma']);
  for (const [label, n] of [['จบแล้ว', 0], ['สายดอง', 3], ['ไม่สะสม', 0], ['ไทย', 0], ['★★★★★', 0]]) {
    await click(React, byText($('.filter-data-popover'), label, '.mini-pill'));
    assert.equal(exportRows().length, n, label);
    await click(React, byText($('.filter-data-popover'), 'ล้างตัวกรอง (1)'));
  }
  await click(React, byText($('.filter-data-popover'), 'ตกลง'));
  assert.ok(!$('.filter-data-popover'));
});

test('ExportCsvModal: choose, reorder and remove columns; at least one must stay', async () => {
  await openExport();
  await click(React, byText(document, 'เลือกคอลัมน์ส่งออก'));
  const pop = () => $('.reorder-popover');
  await click(React, byText(pop(), 'ที่จำเป็น'));
  assert.deepEqual(headers(), ['ชื่อเรื่อง', 'ชื่อภาค / กลุ่มย่อย', 'สถานะการตีพิมพ์', 'ปีที่ตีพิมพ์']);
  await click(React, pop().querySelectorAll('.reorder-item')[3].querySelector('[title^="เลื่อนขึ้น"]'));
  await click(React, pop().querySelectorAll('.reorder-item')[0].querySelector('[title^="เลื่อนลง"]'));
  assert.deepEqual(headers(), ['ชื่อภาค / กลุ่มย่อย', 'ชื่อเรื่อง', 'ปีที่ตีพิมพ์', 'สถานะการตีพิมพ์']);
  while (pop().querySelectorAll('.reorder-item').length > 1) await click(React, pop().querySelector('.btn-remove-col'));
  await click(React, pop().querySelector('.btn-remove-col'));
  assert.equal(headers().length, 1);
  assert.deepEqual(await toastMessages(React), ['error:ต้องเลือกอย่างน้อย 1 คอลัมน์']);
  await click(React, byText(pop(), 'ID', '.btn-add-col'));
  assert.deepEqual(headers(), ['สถานะการตีพิมพ์', 'ID']);
  await click(React, byText(pop(), 'เลือกทั้งหมด'));
  assert.equal(headers().length, CSV_COLUMNS.length);
  await click(React, byText(pop(), 'ตกลง'));
  assert.ok(!pop());
});

test('ExportCsvModal: raw text, copy, download with a BOM', async () => {
  await openExport();
  await click(React, byText(document, 'ข้อความ CSV'));
  const raw = text($('.preview-raw-code'));
  assert.ok(raw.startsWith('ID,ชื่อเรื่อง,'));

  await click(React, byText(document, 'คัดลอก CSV'));
  assert.equal(copied.length, 1);
  assert.ok(!copied[0].startsWith('﻿'));

  const blobs = [], downloads = [];
  const saved = { create: URL.createObjectURL, revoke: URL.revokeObjectURL, click: window.HTMLAnchorElement.prototype.click };
  URL.createObjectURL = b => { blobs.push(b); return 'blob:test'; };
  URL.revokeObjectURL = () => {};
  window.HTMLAnchorElement.prototype.click = function () { downloads.push([this.getAttribute('download'), this.href]); };
  try {
    await click(React, byText(document, 'ดาวน์โหลดไฟล์ CSV'));
  } finally {
    URL.createObjectURL = saved.create; URL.revokeObjectURL = saved.revoke; window.HTMLAnchorElement.prototype.click = saved.click;
  }
  assert.match(downloads[0][0], /^manga_tracker_filtered_series_\d{4}-\d{2}-\d{2}\.csv$/);
  assert.equal(downloads[0][1], 'blob:test');
  const bytes = new Uint8Array(await blobs[0].arrayBuffer()); // .text() would silently drop the BOM
  assert.deepEqual([...bytes.slice(0, 5)], [0xEF, 0xBB, 0xBF, 0x49, 0x44]); // BOM + "ID"
  assert.equal(blobs[0].type, 'text/csv;charset=utf-8;');
});

test('ExportCsvModal: closes from the X and the backdrop, not from a click inside', async () => {
  const onClose = await openExport();
  await click(React, $('.export-modal__header'));
  assert.equal(onClose.calls.length, 0);
  await click(React, $('.export-modal .modal__close'));
  await click(React, $('.modal-overlay'));
  assert.equal(onClose.calls.length, 2);
  await cleanup();
  await openExport({ allSeries: [], filteredSeries: [] });
  await click(React, byText(document, 'คัดลอก CSV')); // disabled: does nothing
  assert.equal(copied.length, 0);
});

// ── App ─────────────────────────────────────────────────────────────────────

const LIB = [
  series([owned(10, [[1, 5]])], [reading('Main', 10, [[1, 10]])], { _id: 'a', title: 'Alpha', type: 'novel', publisher: 'Siam' }),
  series([owned(10, [[1, 5], [11, 15]])], [], { _id: 'b', title: 'Beta', publisher: 'Siam' }), // owns 11-15 of a 10-volume log
  series([owned(2, [[1, 2]])], [], { _id: 'c', title: 'Gamma', publisher: 'Other' }),
];
const STATS = { byType: [], byStatus: [], totals: { totalSeries: 3, collecting: 3, totalRead: 10 } };

const openApp = async () => {
  store.setState({ series: LIB, stats: STATS });
  await render(React, h(App));
  await flush(React);
};
const tiles = () => $$('.telemetry-item__value').map(text);
const meta = () => text($('.content-meta'));

test('App: stat tiles, the missing-volume count counts only volumes inside each total (regression: 5, not 10)', async () => {
  await openApp();
  assert.deepEqual(tiles(), ['3', '3', '10', '10']);
  assert.match(meta(), /แสดง 3 จากทั้งหมด 3 เรื่อง/);
  assert.equal($$('.card').length, 3);
});

test('App: grid/list toggle, sorting, sidebar filter and its reset', async () => {
  await openApp();
  await click(React, byText(document, 'รายการ', '.view-toggle__btn'));
  assert.equal($$('.list-row').length, 3);
  assert.equal(byText(document, 'รายการ', '.view-toggle__btn').getAttribute('aria-pressed'), 'true');
  await click(React, $('.sort-dropdown-trigger'));
  await click(React, byText(document, 'ชื่อเรื่อง A–Z', '.sort-dropdown-item'));
  await click(React, $('.sort-direction-btn'));
  assert.deepEqual([store.getState().filter.sortBy, store.getState().filter.sortOrder], ['title', 'ASC']);
  assert.deepEqual($$('.list-row__title').map(text), ['Alpha', 'Beta', 'Gamma']);

  await click(React, byText($('.filter-sidebar'), 'Novel', '.filter-chip'));
  assert.match(meta(), /แสดง 1 จากทั้งหมด 3 เรื่อง/);
  await click(React, byText($('.content-meta'), 'ล้างตัวกรอง (1)'));
  assert.match(meta(), /แสดง 3 จากทั้งหมด 3 เรื่อง/);
  await click(React, byText(document, 'ตาราง', '.view-toggle__btn'));
  assert.equal($$('.card').length, 3);
});

test('App: the add, checklist and export dialogs open and close', async () => {
  await openApp();
  await click(React, byText(document, 'เพิ่มเรื่องใหม่'));
  assert.equal(text($('#series-modal-title')), 'เพิ่มเรื่องใหม่เข้าระบบ');
  await click(React, $('.modal__close'));
  await click(React, $('.telemetry-item--action'));
  assert.match(text($('.modal__title')), /เช็กลิสต์หนังสือที่ยังขาด/);
  await click(React, byText(document, 'ปิดเช็กลิสต์'));
  await click(React, byText(document, 'Export CSV'));
  assert.ok($('.export-modal'));
  await click(React, $('.export-modal .modal__close'));
  assert.ok(!$('.modal'));
});

test('App: spinner only for the very first load; no stat tiles before stats arrive', async () => {
  api.getAll = () => new Promise(() => {});
  api.getStats = () => new Promise(() => {});
  await render(React, h(App));
  assert.ok($('.loading__spinner'));
  assert.ok(!$('.telemetry-bar'));
});

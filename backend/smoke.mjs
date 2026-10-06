// Smoke test: boots the API on throwaway SQLite files (never the real manga.db) and checks every route plus the
// rules that have regressed before. Run inside the backend container: npm run smoke
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';

const dir = mkdtempSync(path.join(tmpdir(), 'manga-smoke-'));
const servers = [];

const startServer = async (port, dbPath) => {
  const server = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
    env: { ...process.env, PORT: String(port), DB_PATH: dbPath, MAL_CLIENT_ID: process.env.MAL_CLIENT_ID || 'smoke' },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  servers.push(server);
  const base = `http://localhost:${port}/api`;
  for (let i = 0; ; i++) {
    try { await fetch(`${base}/series/stats`); break; }
    catch { if (i > 50) throw new Error('server did not start'); await new Promise(r => setTimeout(r, 200)); }
  }
  const call = async (method, url, body) => {
    const res = await fetch(base + url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body && JSON.stringify(body),
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  return { base, call, stop: () => new Promise(r => { server.once('exit', r); server.kill(); }) };
};

try {
  // ── unit checks on the server-side helpers (loaded through tsx) ───────────
  process.env.DB_PATH = path.join(dir, 'unit.db');
  process.env.MAL_CLIENT_ID ||= 'smoke';
  const { mergeRanges } = await import('./src/utils/mapper.ts');
  assert.deepEqual(mergeRanges([[8, 12], [1, 5], [6, 10]]), [[1, 12]]);
  assert.deepEqual(mergeRanges([[5, 1], [10, 10]]), [[1, 5], [10, 10]]);
  assert.deepEqual(mergeRanges([]), []);
  assert.deepEqual(mergeRanges(null), []);

  // the cover download stops as soon as it passes the cap, even with no content-length (it used to buffer it all)
  const { readCapped } = await import('./src/controllers/coverController.ts');
  assert.equal((await readCapped(new Response(new Uint8Array(5)), 5)).length, 5);
  assert.equal((await readCapped(new Response(null), 5)).length, 0);
  await assert.rejects(readCapped(new Response(new Uint8Array(6)), 5), /ไฟล์รูปใหญ่เกินไป/);
  let pulled = 0;
  const endless = new ReadableStream({ pull(c) { pulled++; c.enqueue(new Uint8Array(1)); } });
  await assert.rejects(readCapped(new Response(endless), 3), /ไฟล์รูปใหญ่เกินไป/);
  assert.ok(pulled < 10);

  const { call, base } = await startServer(3999, path.join(dir, 'smoke.db'));
  const sql = new Database(path.join(dir, 'smoke.db'));
  const base1 = { author: 'A', publisher: 'P' };

  // format survives a round trip; touching ranges merges contiguous ones; missing format defaults to 'normal'
  const created = await call('POST', '/series', {
    ...base1, title: 'Cancelled', status: 'cancelled', endYear: 2010,
    collectionLogs: [
      { title: 'E-Book', format: 'digital', totalVolumes: 5, ranges: [[1, 3], [4, 5]] },
      { title: 'Plain', totalVolumes: 2, ranges: [] },
    ],
  });
  assert.equal(created.status, 201);
  const [digital, plain] = created.body.collectionLogs;
  assert.equal(digital.format, 'digital');
  assert.deepEqual(digital.ranges, [[1, 5]]);
  assert.equal(plain.format, 'normal');
  assert.equal(created.body.endYear, 2010);
  const id = created.body.id;

  // editing a cancelled series must keep its end year (it used to be nulled)
  let r = await call('PATCH', `/series/${id}`, { notes: 'x', status: 'cancelled', endYear: 2010 });
  assert.equal(r.body.endYear, 2010);
  assert.equal(r.body.collectionLogs.length, 2);

  // a status-only PATCH must not wipe the end year either
  const done = await call('POST', '/series', { ...base1, title: 'Done', status: 'completed', endYear: 2001 });
  r = await call('PATCH', `/series/${done.body.id}`, { status: 'completed' });
  assert.equal(r.body.endYear, 2001);

  // running series have no end year
  r = await call('PATCH', `/series/${id}`, { status: 'ongoing' });
  assert.equal(r.body.endYear, null);

  // ...and creating one never stores an end year either
  const hiatus = await call('POST', '/series', { ...base1, title: 'Hiatus', status: 'hiatus', endYear: 2005 });
  assert.equal(hiatus.body.endYear, null);
  assert.equal((await call('DELETE', `/series/${hiatus.body.id}`)).status, 200);

  // format persists across a fresh read
  const list = await call('GET', '/series');
  const reread = list.body.data.find(s => s.id === id);
  assert.equal(reread.collectionLogs[0].format, 'digital');

  // saving again keeps the id of every collection log the series owns (the missing checklist remembers ticked
  // items by it); an id the series doesn't own gets a fresh row instead of failing or stealing it
  const [kept0, kept1] = reread.collectionLogs;
  const other = await call('POST', '/series', { ...base1, title: 'Other', collectionLogs: [{ title: 'x', ranges: [] }] });
  const foreignId = other.body.collectionLogs[0].id;
  r = await call('PATCH', `/series/${id}`, {
    collectionLogs: [{ ...kept1, title: 'Plain 2', ranges: [[1, 2]] }, kept0, { title: 'New', id: foreignId, ranges: [] }],
  });
  assert.equal(r.status, 200);
  const byTitle = Object.fromEntries(r.body.collectionLogs.map(l => [l.title, l]));
  assert.equal(r.body.collectionLogs.length, 3);
  assert.equal(byTitle['Plain 2'].id, kept1.id);
  assert.deepEqual(byTitle['Plain 2'].ranges, [[1, 2]]);
  assert.equal(byTitle[kept0.title].id, kept0.id);
  assert.notEqual(byTitle.New.id, foreignId);
  r = await call('PATCH', `/series/${id}`, { collectionLogs: [kept0] });
  assert.deepEqual(r.body.collectionLogs.map(l => l.id), [kept0.id]);
  assert.equal((await call('DELETE', `/series/${other.body.id}`)).status, 200);

  // language defaults to 'th'; a partial log keeps its language and drops totalVolumes (it is never "missing")
  const aoashi = await call('POST', '/series', {
    ...base1, title: 'Aoashi',
    collectionLogs: [
      { title: 'TH', totalVolumes: 40, ranges: [[1, 35]] },
      { title: 'ปกพิเศษ', language: 'jp', isPartial: true, totalVolumes: 40, ranges: [[39, 39]] },
    ],
  });
  assert.equal(aoashi.status, 201);
  const [th, jp] = aoashi.body.collectionLogs;
  assert.equal(th.language, 'th');
  assert.equal(th.isPartial, false);
  assert.equal(jp.language, 'jp');
  assert.equal(jp.isPartial, true);
  assert.equal(jp.totalVolumes, null);
  assert.equal((await call('POST', '/series', { ...base1, title: 'Bad', collectionLogs: [{ language: 'xx', ranges: [] }] })).status, 400);
  assert.equal((await call('DELETE', `/series/${aoashi.body.id}`)).status, 200);

  // unknown ids are 404, not a silent 200
  assert.equal((await call('PATCH', '/series/99999', { notes: 'x' })).status, 404);
  assert.equal((await call('DELETE', '/series/99999')).status, 404);
  assert.equal((await call('DELETE', `/series/${id}`)).status, 200);

  // ── validation: every bad payload is a 400 that names the field ──────────
  const good = { ...base1, title: 'Valid' };
  for (const [name, body, field] of [
    ['missing title', { ...good, title: undefined }, 'title'],
    ['blank author', { ...good, author: '   ' }, 'author'],
    ['unknown type', { ...good, type: 'comic' }, 'type'],
    ['unknown status', { ...good, status: 'paused' }, 'status'],
    ['rating above 5', { ...good, rating: 6 }, 'rating'],
    ['cover that is not a URL', { ...good, imageUrl: 'not a url' }, 'imageUrl'],
    ['fractional year', { ...good, publishYear: 2019.5 }, 'publishYear'],
    ['fractional total', { ...good, readingLogs: [{ totalVolumes: 2.5, ranges: [] }] }, 'readingLogs.0.totalVolumes'],
    ['one-ended range', { ...good, readingLogs: [{ ranges: [[1]] }] }, 'readingLogs.0.ranges.0'],
    ['negative volume', { ...good, collectionLogs: [{ ranges: [[-1, 2]] }] }, 'collectionLogs.0.ranges.0.0'],
  ]) {
    r = await call('POST', '/series', body);
    assert.equal(r.status, 400, name);
    assert.ok(r.body.details.some(d => d.path === field), `${name}: ${JSON.stringify(r.body.details)}`);
  }
  const valid = await call('POST', '/series', good);
  assert.equal(valid.status, 201);
  for (const body of [{ title: '  ' }, { publisher: '' }, { rating: -1 }]) {
    assert.equal((await call('PATCH', `/series/${valid.body.id}`, body)).status, 400, JSON.stringify(body));
  }
  // defaults for an omitted field
  assert.deepEqual([valid.body.type, valid.body.status, valid.body.isCollecting, valid.body.rating, valid.body.imageUrl],
    ['manga', 'ongoing', true, 0, '']);

  // reading ranges are merged on the server too (reversed bounds fixed)
  r = await call('PATCH', `/series/${valid.body.id}`, { readingLogs: [{ title: 'Main', totalVolumes: 20, ranges: [[5, 1], [3, 8], [10, 12], [13, 13]] }] });
  assert.deepEqual(r.body.readingLogs[0].ranges, [[1, 8], [10, 13]]);

  // any accepted PATCH bumps updatedAt, logs-only or author-only included (it used to need a plain field)
  for (const body of [{ readingLogs: [] }, { collectionLogs: [] }, { author: 'Someone' }]) {
    sql.prepare("UPDATE series SET updatedAt = '2000-01-01 00:00:00' WHERE id = ?").run(valid.body.id);
    r = await call('PATCH', `/series/${valid.body.id}`, body);
    assert.notEqual(r.body.updatedAt, '2000-01-01 00:00:00', JSON.stringify(body));
  }

  // deleting cascades to every log and range
  r = await call('PATCH', `/series/${valid.body.id}`, {
    readingLogs: [{ ranges: [[1, 2]] }], collectionLogs: [{ ranges: [[1, 2]] }],
  });
  assert.equal((await call('DELETE', `/series/${valid.body.id}`)).status, 200);
  const leftover = sql.prepare(`SELECT
    (SELECT COUNT(*) FROM reading_groups WHERE series_id = ?) + (SELECT COUNT(*) FROM collection_groups WHERE series_id = ?) +
    (SELECT COUNT(*) FROM reading_ranges WHERE group_id NOT IN (SELECT id FROM reading_groups)) +
    (SELECT COUNT(*) FROM collection_ranges WHERE group_id NOT IN (SELECT id FROM collection_groups)) AS n`).get(valid.body.id, valid.body.id);
  assert.equal(leftover.n, 0);

  // ── listing: filters, search, sort, pagination ───────────────────────────
  for (const s of (await call('GET', '/series')).body.data) await call('DELETE', `/series/${s.id}`);
  const naruto = await call('POST', '/series', {
    title: 'Naruto', author: 'Kishimoto', publisher: 'Siam', type: 'manga', status: 'ongoing',
    // 11-15 sit past the total, 0 is not a counted volume: only 1-5 + 1-3 of the unknown-total log are "read"
    readingLogs: [{ title: 'Main', totalVolumes: 10, ranges: [[0, 5], [11, 15]] }, { title: 'Side', ranges: [[1, 3]] }],
  });
  await call('POST', '/series', { title: 'Overlord', author: 'Maruyama', publisher: 'Phoenix', type: 'novel', status: 'completed', endYear: 2020, isCollecting: false });
  await call('POST', '/series', { title: 'Re:Zero', author: 'Nagatsuki', publisher: 'Phoenix', type: 'light_novel', status: 'hiatus', isCollectingStopped: true });
  const titles = async query => (await call('GET', `/series${query}`)).body.data.map(s => s.title).sort().join(',');
  assert.equal(await titles('?type=novel'), 'Overlord');
  assert.equal(await titles('?status=hiatus'), 'Re:Zero');
  assert.equal(await titles('?isCollecting=false'), 'Overlord');
  assert.equal(await titles('?isCollecting=1'), 'Naruto,Re:Zero');
  assert.equal(await titles('?isCollecting='), 'Naruto,Overlord,Re:Zero');
  assert.equal(await titles('?search=phoe'), 'Overlord,Re:Zero');
  assert.equal(await titles('?search=KISHI'), 'Naruto');
  assert.equal(await titles(`?search=${encodeURIComponent('  Naruto  ')}`), 'Naruto');
  assert.equal(await titles('?type=novel&status=ongoing'), '');

  const ordered = async query => (await call('GET', `/series${query}`)).body;
  assert.deepEqual((await ordered('?sortBy=title&sortOrder=ASC')).data.map(s => s.title), ['Naruto', 'Overlord', 'Re:Zero']);
  assert.deepEqual((await ordered('?sortBy=title&sortOrder=DESC')).data.map(s => s.title), ['Re:Zero', 'Overlord', 'Naruto']);
  assert.equal((await call('GET', `/series?sortBy=${encodeURIComponent('title; DROP TABLE series')}&sortOrder=sideways`)).status, 200);
  let page = await ordered('?sortBy=title&sortOrder=ASC&limit=2&page=2');
  assert.deepEqual([page.data.map(s => s.title), page.pagination], [['Re:Zero'], { total: 3, page: 2, pages: 2 }]);
  page = await ordered('?limit=abc&page=0');
  assert.deepEqual(page.pagination, { total: 3, page: 1, pages: 1 });
  assert.equal((await ordered('?limit=5000')).data.length, 3);

  // ── stats ────────────────────────────────────────────────────────────────
  const stats = (await call('GET', '/series/stats')).body;
  // collecting = collecting and not stopped; read volumes stay inside each known total (it counted 0 and 11-15 too)
  assert.deepEqual(stats.totals, { totalSeries: 3, collecting: 1, totalRead: 8 });
  const counts = rows => Object.fromEntries(rows.map(x => [x._id, x.count]));
  assert.deepEqual(counts(stats.byType), { manga: 1, novel: 1, light_novel: 1 });
  assert.deepEqual(counts(stats.byStatus), { ongoing: 1, completed: 1, hiatus: 1 });

  // ── authors / publishers ─────────────────────────────────────────────────
  await call('PATCH', `/series/${naruto.body.id}`, { author: 'Kishimoto' }); // existing name: no duplicate row
  await call('PATCH', `/series/${naruto.body.id}`, { publisher: 'Zeta Books' });
  const names = async url => (await call('GET', url)).body.map(x => x.name);
  const authors = await names('/authors');
  assert.deepEqual(authors.filter(n => n === 'Kishimoto'), ['Kishimoto']);
  assert.deepEqual(authors, [...authors].sort());
  assert.ok((await names('/publishers')).includes('Zeta Books'));

  // ── MAL proxy ────────────────────────────────────────────────────────────
  r = await call('GET', '/mal/search');
  assert.equal(r.status, 400);
  assert.ok(r.body.error);

  // ── cover cache ──────────────────────────────────────────────────────────
  // a cached cover is served with no network at all (the .invalid host can never resolve)
  const cover = (url, timeoutMs) => fetch(`${base}/cover${url === undefined ? '' : `?url=${encodeURIComponent(url)}`}`, {
    signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
  });
  const offlineUrl = 'https://cover.invalid/a.png';
  mkdirSync(path.join(dir, 'covers'), { recursive: true });
  writeFileSync(path.join(dir, 'covers', `${createHash('sha256').update(offlineUrl).digest('hex')}.png`), 'png-bytes');
  r = await cover(offlineUrl);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'image/png');
  assert.equal(await r.text(), 'png-bytes');

  // ...and the server never fetches for the page from the local network or non-http schemes
  assert.equal((await cover()).status, 400);
  assert.equal((await cover('not a url')).status, 400);
  assert.equal((await cover('http://127.0.0.1:1/x.png')).status, 400);
  assert.equal((await cover('http://192.168.1.10/x.png')).status, 400);
  assert.equal((await cover('http://[::1]/x.png')).status, 400);
  assert.equal((await cover('ftp://example.com/x.png')).status, 400);
  assert.equal((await cover('https://cover.invalid/never-cached.png')).status, 502);

  // a public address must get past the host check (this regressed once: everything was blocked).
  // A blocked host answers 400 within milliseconds; a public one just fails/hangs on the network.
  const pub = await cover('http://203.0.113.1/x.png', 1500).then(res => res.status, () => 'pending');
  assert.notEqual(pub, 400);
  sql.close();

  // ── legacy database: the JSON-column schema is migrated on boot, once ─────
  const legacyPath = path.join(dir, 'legacy.db');
  const legacy = new Database(legacyPath);
  legacy.exec(`
    CREATE TABLE series (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, type TEXT DEFAULT 'manga', publishYear INTEGER,
      endYear INTEGER DEFAULT NULL, status TEXT DEFAULT 'ongoing', isCollecting INTEGER DEFAULT 1, rating REAL DEFAULT 0,
      imageUrl TEXT DEFAULT '', notes TEXT, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      author TEXT, publisher TEXT, readingLogsJSON TEXT, collectionLogsJSON TEXT
    );`);
  legacy.prepare('INSERT INTO series (title, author, publisher, readingLogsJSON, collectionLogsJSON) VALUES (?, ?, ?, ?, ?)').run(
    'Legacy', 'Old Author', 'Old Pub',
    JSON.stringify([{ title: 'Main', totalVolumes: 5, ranges: [[1, 2]] }]),
    JSON.stringify([{ title: 'Reg', totalVolumes: 5, ranges: [[1, 5]] }]));
  legacy.prepare('INSERT INTO series (title) VALUES (?)').run('Bare');
  legacy.close();

  for (let boot = 0; boot < 2; boot++) { // the second boot must not migrate (or duplicate) anything again
    const old = await startServer(3998 - boot, legacyPath);
    const rows = (await old.call('GET', '/series?sortBy=title&sortOrder=DESC')).body.data;
    assert.deepEqual(rows.map(s => [s.title, s.author, s.publisher]), [['Legacy', 'Old Author', 'Old Pub'], ['Bare', '', '']]);
    assert.deepEqual(rows[0].readingLogs.map(({ id, ...l }) => l), [{ title: 'Main', totalVolumes: 5, ranges: [[1, 2]] }]);
    assert.deepEqual(rows[0].collectionLogs.map(({ id, ...l }) => l),
      [{ title: 'Reg', totalVolumes: 5, format: 'normal', language: 'th', isPartial: false, ranges: [[1, 5]] }]);
    assert.deepEqual([rows[1].readingLogs, rows[1].collectionLogs, rows[1].isCollectingStopped], [[], [], false]);
    await old.stop();
  }
  const check = new Database(legacyPath, { readonly: true });
  const columns = check.prepare('PRAGMA table_info(series)').all().map(c => c.name);
  check.close();
  assert.ok(!columns.includes('readingLogsJSON') && !columns.includes('author'));
  assert.ok(columns.includes('author_id') && columns.includes('isCollectingStopped'));

  console.log('smoke OK');
} finally {
  for (const s of servers) s.kill();
  try { rmSync(dir, { recursive: true, force: true }); } catch { /* Windows: a handle may still be closing */ }
}

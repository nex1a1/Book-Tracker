// Smoke test: boots the API on a throwaway SQLite file (never the real manga.db) and checks the
// rules that have regressed before. Run inside the backend container: npm run smoke
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const PORT = 3999;
const base = `http://localhost:${PORT}/api`;
const dir = mkdtempSync(path.join(tmpdir(), 'manga-smoke-'));
const server = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
  env: { ...process.env, PORT, DB_PATH: path.join(dir, 'smoke.db'), MAL_CLIENT_ID: process.env.MAL_CLIENT_ID || 'smoke' },
  stdio: ['ignore', 'ignore', 'inherit'],
});

const call = async (method, url, body) => {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};

try {
  for (let i = 0; ; i++) {
    try { await fetch(`${base}/series/stats`); break; }
    catch { if (i > 50) throw new Error('server did not start'); await new Promise(r => setTimeout(r, 200)); }
  }

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

  // cover cache: a cached cover is served with no network at all (the .invalid host can never resolve)
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
  assert.equal((await cover('http://127.0.0.1:1/x.png')).status, 400);
  assert.equal((await cover('ftp://example.com/x.png')).status, 400);
  assert.equal((await cover('https://cover.invalid/never-cached.png')).status, 502);

  // a public address must get past the host check (this regressed once: everything was blocked).
  // A blocked host answers 400 within milliseconds; a public one just fails/hangs on the network.
  const pub = await cover('http://203.0.113.1/x.png', 1500).then(res => res.status, () => 'pending');
  assert.notEqual(pub, 400);

  console.log('smoke OK');
} finally {
  server.kill();
  rmSync(dir, { recursive: true, force: true });
}

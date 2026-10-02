import { Request, Response } from 'express';
import crypto from 'crypto';
import dns from 'dns/promises';
import fs from 'fs';
import net from 'net';
import path from 'path';
import { config } from '../config/env.js';
import { getErrorMessage } from '../utils/errors.js';

// Cover cache: the first request for a remote cover downloads it next to the database; every later
// request (including with no internet) is served from disk. The DB keeps the original URL untouched.
const COVER_DIR = path.resolve(path.dirname(config.DB_PATH), 'covers');
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
const EXTS = [...new Set(Object.values(EXT_BY_TYPE))];

// The server fetches whatever URL the page asks for, so it must never reach into the local network.
const privateNets = new net.BlockList();
for (const [addr, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.168.0.0', 16],
] as const) privateNets.addSubnet(addr, prefix, 'ipv4');
// (IPv4-mapped IPv6 like ::ffff:127.0.0.1 is already matched by the IPv4 rules above)
for (const [addr, prefix] of [['::1', 128], ['fc00::', 7], ['fe80::', 10]] as const) {
  privateNets.addSubnet(addr, prefix, 'ipv6');
}

class BadCoverUrl extends Error {}

// ponytail: resolves DNS here and again inside fetch (rebinding window); pin the IP via a custom
// dispatcher if this ever serves untrusted users instead of one local owner.
const assertPublicHost = async (hostname: string): Promise<void> => {
  const addrs = await dns.lookup(hostname, { all: true });
  if (addrs.some(a => privateNets.check(a.address, a.family === 6 ? 'ipv6' : 'ipv4'))) {
    throw new BadCoverUrl('ไม่อนุญาตให้ดึงรูปจากที่อยู่ภายในเครือข่าย');
  }
};

const fetchImage = async (rawUrl: string): Promise<globalThis.Response> => {
  let url: URL;
  try { url = new URL(rawUrl); } catch { throw new BadCoverUrl('URL ไม่ถูกต้อง'); }
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new BadCoverUrl('รองรับเฉพาะ http/https');
    await assertPublicHost(url.hostname);
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10_000) });
    const next = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && next) {
      url = new URL(next, url);
      continue;
    }
    return res;
  }
  throw new Error('redirect มากเกินไป');
};

const findCached = (hash: string): string | undefined =>
  EXTS.map(ext => path.join(COVER_DIR, `${hash}.${ext}`)).find(f => fs.existsSync(f));

export const getCover = async (req: Request, res: Response) => {
  const rawUrl = req.query.url;
  if (typeof rawUrl !== 'string' || !rawUrl) {
    res.status(400).json({ error: 'กรุณาส่ง url ของรูปปกมาด้วย' });
    return;
  }

  const serve = (file: string) => res.sendFile(file, { maxAge: '365d', immutable: true });
  const hash = crypto.createHash('sha256').update(rawUrl).digest('hex');
  const cached = findCached(hash);
  if (cached) {
    serve(cached);
    return;
  }

  try {
    const upstream = await fetchImage(rawUrl);
    const type = upstream.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? '';
    const ext = EXT_BY_TYPE[type];
    if (!upstream.ok || !ext) throw new Error(`ต้นทางตอบกลับ ${upstream.status} (${type || 'ไม่ทราบชนิดไฟล์'})`);
    if (Number(upstream.headers.get('content-length')) > MAX_BYTES) throw new Error('ไฟล์รูปใหญ่เกินไป');

    const body = Buffer.from(await upstream.arrayBuffer());
    if (body.length > MAX_BYTES) throw new Error('ไฟล์รูปใหญ่เกินไป');

    // write-then-rename so a crash can never leave a half-written image that looks cached
    fs.mkdirSync(COVER_DIR, { recursive: true });
    const file = path.join(COVER_DIR, `${hash}.${ext}`);
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, body);
    fs.renameSync(tmp, file);
    serve(file);
  } catch (error) {
    const message = getErrorMessage(error);
    console.error('[getCover] Error:', message);
    res.status(error instanceof BadCoverUrl ? 400 : 502).json({ error: message });
  }
};

// Shared test harness: loads the real TypeScript sources through Vite (no build step) and, for UI tests, a
// jsdom document that React renders into. Every test file runs in its own process (node --test).
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';

let vite;

/** Starts Vite once per test file; returns a loader for `/src/...` modules. */
export async function startVite() {
  vite = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    configFile: false,
    appType: 'custom',
    logLevel: 'silent',
    esbuild: { jsx: 'automatic' },
    optimizeDeps: { noDiscovery: true, include: [] }, // no dep pre-bundling: SSR loads node_modules directly
    server: { middlewareMode: true, watch: null },
  });
  return path => vite.ssrLoadModule(path);
}

export const stopVite = () => vite?.close();

// ── Fixtures ────────────────────────────────────────────────────────────────
let nextId = 0;
export const reading = (title, totalVolumes, ranges) => ({ id: `r${nextId++}`, title, totalVolumes, ranges });
export const owned = (totalVolumes, ranges, extra = {}) =>
  ({ id: `c${nextId++}`, title: '', format: 'normal', totalVolumes, ranges, ...extra });
export const series = (collectionLogs = [], readingLogs = [], extra = {}) => ({
  _id: String(extra.id ?? 1), id: 1, title: 'T', author: 'A', publisher: 'P', type: 'manga', status: 'ongoing',
  isCollecting: true, isCollectingStopped: false, rating: 0, readingLogs, collectionLogs,
  createdAt: '2026-01-01 00:00:00', updatedAt: '2026-01-01 00:00:00', ...extra,
});

// ── DOM (UI tests only) ─────────────────────────────────────────────────────
/** Installs a jsdom window as the global environment React and the components expect. */
export function installDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
  const { window } = dom;
  for (const key of Object.getOwnPropertyNames(window)) {
    if (!(key in globalThis)) {
      try { globalThis[key] = window[key]; } catch { /* read-only */ }
    }
  }
  // Node has its own (partial) versions of these; the components must see the browser's.
  for (const key of ['window', 'document', 'navigator', 'localStorage', 'Event', 'KeyboardEvent', 'MouseEvent']) {
    Object.defineProperty(globalThis, key, { value: key === 'window' ? window : window[key], configurable: true, writable: true });
  }
  window.HTMLElement.prototype.scrollIntoView = () => {}; // jsdom has no layout
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  return window;
}

const mounted = new Set();

/** Renders a React element into a fresh container; returns the container and an unmount function. */
export async function render(React, element) {
  const { createRoot } = await import('react-dom/client');
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await React.act(async () => root.render(element));
  const unmount = async () => {
    if (!mounted.delete(unmount)) return;
    await React.act(async () => root.unmount());
    container.remove();
  };
  mounted.add(unmount);
  return { container, rerender: el => React.act(async () => root.render(el)), unmount };
}

/** Unmounts everything a test rendered (portals included); use in afterEach. */
export async function cleanup() {
  for (const unmount of [...mounted]) await unmount();
  document.body.innerHTML = '';
}

/** Visible toasts, newest first, as "type:message". */
export async function toastMessages(React) {
  const { useToasterStore } = await import('react-hot-toast');
  const { result, unmount } = await renderHook(React, useToasterStore);
  await unmount();
  return result.current.toasts.filter(t => t.visible !== false).map(t => `${t.type}:${t.message}`);
}

/** Mounts a hook inside a tiny component; `result.current` always holds its latest return value. */
export async function renderHook(React, hook, props) {
  const result = {};
  const Probe = p => { result.current = hook(p); return null; };
  const view = await render(React, React.createElement(Probe, props));
  return { result, ...view, rerender: p => view.rerender(React.createElement(Probe, p)) };
}

export const click = (React, el) => React.act(async () => {
  if (!el) throw new Error('click: element not found');
  el.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }));
  el.click();
});

/** Types into an input the way React notices (native value setter + input event). */
export const type = (React, el, value) => React.act(async () => {
  if (!el) throw new Error('type: element not found');
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, String(value));
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
});

export const key = (React, el, k, opts = {}) => React.act(async () => {
  el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...opts }));
});

/** Lets pending timers/promises (debounces, async handlers) run inside act. */
export const flush = (React, ms = 0) => React.act(() => new Promise(r => setTimeout(r, ms)));

/** The first element matching `selector` whose trimmed text contains `text`. */
export const byText = (root, text, selector = 'button') =>
  [...root.querySelectorAll(selector)].find(el => el.textContent.replace(/\s+/g, ' ').trim().includes(text));

export const text = el => el.textContent.replace(/\s+/g, ' ').trim();

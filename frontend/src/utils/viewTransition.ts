import { flushSync } from "react-dom";

// View transitions (CSS in index.css). Skipped when unsupported or the user asked for reduced
// motion; Chrome also skips them in a hidden tab.
const canAnimate = () =>
  !!document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches;

// Grid cards / list rows, and the parts of them that move on their own when the view switches.
const ITEMS = '.card-grid > .card, .list-row';
const PARTS = '.card__cover-wrapper, .list-row__cover-wrapper, .card__title, .list-row__title';

// Names every on-screen item by its index in the whole list (the series order is the same in
// every view and layout), so an item morphs from its old box to its new one. Box and title
// change shape, so they swap their content (index.css); the cover keeps its morph. Returns the
// named elements so the names can be cleared once the transition ends.
const nameVisibleItems = () => [...document.querySelectorAll<HTMLElement>(ITEMS)]
  .flatMap((item, i) => {
    const r = item.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= innerHeight) return [];
    return [item, ...item.querySelectorAll<HTMLElement>(PARTS)].map(el => {
      const part = el === item ? 'box' : el.className.includes('cover') ? 'cover' : 'title';
      el.style.viewTransitionName = `item-${i}-${part}`;
      if (part !== 'cover') el.style.setProperty('view-transition-class', part === 'box' ? 'layout-card' : 'layout-swap');
      return el;
    });
  });

// Runs a view/layout switch as a view transition: on-screen items morph, the rest cross-fades.
// Names exist only during the transition, so nothing carries a view-transition-name otherwise.
export const morphSwitch = (update: () => void) => {
  if (!canAnimate()) {
    update();
    return;
  }
  const named = nameVisibleItems();
  document.startViewTransition(() => {
    flushSync(update);
    named.push(...nameVisibleItems());
  }).finished.finally(() => named.forEach(el => {
    el.style.viewTransitionName = '';
    el.style.removeProperty('view-transition-class');
  }));
};

// Reorders rows inside a scroll box (missing-volume checklist: grouped by publisher <-> flat
// list) so each row slides to its new spot. Rows are named by their own key (`data-vt-key`):
// the same row exists in both views, just elsewhere. Only rows fully inside the box are named —
// a named row is drawn above everything and would show over the dialog's header or footer.
export const morphRows = (scrollerSelector: string, update: () => void) => {
  const scroller = document.querySelector<HTMLElement>(scrollerSelector);
  if (!canAnimate() || !scroller) {
    update();
    return;
  }
  const nameRows = () => {
    const box = scroller.getBoundingClientRect();
    return [...scroller.querySelectorAll<HTMLElement>('[data-vt-key]')].filter(row => {
      const r = row.getBoundingClientRect();
      if (r.top < box.top || r.bottom > box.bottom) return false;
      row.style.viewTransitionName = `row-${row.dataset.vtKey?.replace(/[^\w-]/g, '_')}`;
      return true;
    });
  };
  const named = nameRows();
  document.startViewTransition(() => {
    flushSync(update);
    named.push(...nameRows());
  }).finished.finally(() => named.forEach(row => { row.style.viewTransitionName = ''; }));
};

// Closes a modal with an exit animation: the topmost overlay fades and its panel drops away.
// A modal opens with a plain CSS animation (Modals.css), but closing unmounts it at once, so the
// exit is played from a snapshot instead. `update` is the parent's state change that unmounts it.
export const closeModal = (update: () => void) => {
  const overlays = document.querySelectorAll<HTMLElement>('.modal-overlay');
  const overlay = overlays[overlays.length - 1];
  const panel = overlay?.querySelector<HTMLElement>('.modal');
  if (!canAnimate() || !overlay || !panel) {
    update();
    return;
  }
  overlay.style.viewTransitionName = 'modal-overlay';
  panel.style.viewTransitionName = 'modal-panel';
  document.documentElement.classList.add('vt-modal-close');
  document.startViewTransition(() => flushSync(update)).finished.finally(() => {
    document.documentElement.classList.remove('vt-modal-close');
    overlay.style.viewTransitionName = '';
    panel.style.viewTransitionName = '';
  });
};

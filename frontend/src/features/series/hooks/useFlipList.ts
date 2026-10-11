import { RefObject, useLayoutEffect, useRef } from "react";
import { SLIDE } from "./useFlipTable";

// FLIP for the main grid / list, run after every render: an item (`[data-flip]`, keyed by series
// id) still shown after a filter, search or sort change slides from its old spot to the new one;
// a newly shown item fades in; a removed one just goes and the rest close the gap. Plain Web
// Animations, so typing in search or clicking filter chips is never blocked. Only items on
// screen (before or after) animate.
//
// `resetKey`: when it changes (the card layout switch, which runs its own view-transition
// morph), positions are re-recorded without animating, so the two never stack.
export function useFlipList(containerRef: RefObject<HTMLElement>, resetKey?: string) {
  const before = useRef(new Map<string, { x: number; y: number }>());
  const lastReset = useRef(resetKey);
  const started = useRef(false); // the first run (view just mounted) only records positions

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const reset = !started.current || lastReset.current !== resetKey;
    started.current = true;
    lastReset.current = resetKey;
    const animate = !reset && typeof container.animate === "function"
      && !matchMedia("(prefers-reduced-motion: reduce)").matches;

    const next = new Map<string, { x: number; y: number }>();
    container.querySelectorAll<HTMLElement>("[data-flip]").forEach(el => {
      const key = el.dataset.flip!;
      const pos = { x: el.offsetLeft, y: el.offsetTop };
      const old = before.current.get(key);
      next.set(key, pos);
      if (!animate) return;
      const rect = el.getBoundingClientRect();
      if (!old) {
        if (rect.bottom > 0 && rect.top < innerHeight) el.animate([{ opacity: 0 }, { opacity: 1 }], SLIDE);
        return;
      }
      const dx = old.x - pos.x, dy = old.y - pos.y;
      if (!dx && !dy) return;
      const onScreen = (top: number) => top + rect.height > 0 && top < innerHeight;
      if (!onScreen(rect.top) && !onScreen(rect.top + dy)) return;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], SLIDE);
    });
    before.current = next;
  });
}

import { RefObject, useLayoutEffect, useRef } from "react";

export const SLIDE: KeyframeAnimationOptions = { duration: 320, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" };

// FLIP for the CSV export preview, run after every render: a row (`tr[data-row]`) or column
// (`th[data-col]`, with its cells `[data-col]`) that is still there but moved slides from its old
// spot to the new one. New rows/columns fade in with CSS (ExportCsvModal.css). Plain Web
// Animations rather than a view transition: those swallow clicks while they play, and the
// filter popover is clicked in quick runs. Positions come from offsetTop/offsetLeft, which
// ignore running transforms. Only rows in (or next to) the visible part of the scroll box move.
export function useFlipTable(tableRef: RefObject<HTMLTableElement>) {
  const rowsBefore = useRef(new Map<string, number>());
  const colsBefore = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const table = tableRef.current;
    if (!table) {
      // Raw tab or empty result: the next table starts fresh instead of sliding from stale spots.
      rowsBefore.current.clear();
      colsBefore.current.clear();
      return;
    }
    const animate = typeof table.animate === "function" && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    const box = table.parentElement;
    const viewTop = box ? box.scrollTop - 200 : -Infinity;
    const viewBottom = box ? box.scrollTop + box.clientHeight + 200 : Infinity;
    const inView = (top: number) => top > viewTop && top < viewBottom;

    const rows = new Map<string, number>();
    const visibleRows: HTMLElement[] = [];
    table.querySelectorAll<HTMLElement>("tr[data-row]").forEach(tr => {
      const top = tr.offsetTop;
      const old = rowsBefore.current.get(tr.dataset.row!);
      rows.set(tr.dataset.row!, top);
      if (!inView(top)) return;
      visibleRows.push(tr);
      if (animate && old !== undefined && old !== top) {
        tr.animate([{ transform: `translateY(${old - top}px)` }, { transform: "none" }], SLIDE);
      }
    });
    rowsBefore.current = rows;

    // Columns slide only when the column set or order changed. A filter also shifts columns (the
    // widths follow the remaining rows), but sliding every cell sideways for that is just noise.
    const headers = [...table.querySelectorAll<HTMLElement>("th[data-col]")];
    const columnsChanged = headers.map(th => th.dataset.col).join("|") !== [...colsBefore.current.keys()].join("|");
    const cols = new Map<string, number>();
    headers.forEach(th => {
      const key = th.dataset.col!;
      const left = th.offsetLeft;
      const old = colsBefore.current.get(key);
      cols.set(key, left);
      if (!animate || !columnsChanged || old === left) return;
      // A column that just appeared fades in; one that moved slides over. Visible rows only.
      const frames = old === undefined
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ transform: `translateX(${old - left}px)` }, { transform: "none" }];
      // On the first render (or back from the raw tab) every column is "new": the rows' own fade covers it.
      if (old === undefined && colsBefore.current.size === 0) return;
      th.animate(frames, SLIDE);
      visibleRows.forEach(tr => tr.querySelector<HTMLElement>(`td[data-col="${CSS.escape(key)}"]`)?.animate(frames, SLIDE));
    });
    colsBefore.current = cols;
  });
}

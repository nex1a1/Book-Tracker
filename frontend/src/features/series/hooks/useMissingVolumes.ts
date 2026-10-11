import { useState, useMemo, useEffect, useRef } from "react";
import { useSeriesStore } from "../../../store/useSeriesStore";
import { getSeriesDerivedStats, getMissingVolumesText, countMissingVolumes, getCollectionLogLabel } from "../../../utils/helpers";
import { TYPE_LABEL } from "../../../utils/constants";
import { Series } from "../../../types";

export interface MissingLogItem {
  id: string;
  format?: string;
  title: string;
  missingText: string;
  missingCount: number;
  totalVolumes: number;
}

export interface MissingSeriesItem {
  _id: string;
  title: string;
  author: string;
  publisher: string;
  typeStr: string;
  rawType: string;
  formats: MissingLogItem[];
  rawSeries: Series;
}

const sumFormats = (item: MissingSeriesItem, pick: (f: MissingLogItem) => number) =>
  item.formats.reduce((sum, f) => sum + pick(f), 0);

// Sortable checklist columns. A series with several missing logs sorts by their sum.
const SORT_VALUE = {
  title: (i: MissingSeriesItem) => i.title,
  author: (i: MissingSeriesItem) => i.author || '',
  publisher: (i: MissingSeriesItem) => i.publisher || '',
  publishYear: (i: MissingSeriesItem) => i.rawSeries.publishYear ?? 0,
  total: (i: MissingSeriesItem) => sumFormats(i, f => f.totalVolumes),
  owned: (i: MissingSeriesItem) => sumFormats(i, f => f.totalVolumes - f.missingCount),
  missing: (i: MissingSeriesItem) => sumFormats(i, f => f.missingCount),
};
export type ChecklistSortKey = keyof typeof SORT_VALUE;

// Column sort for the checklist; '' keeps the store's order. Ties fall back to the title.
const compareItems = (key: ChecklistSortKey, a: MissingSeriesItem, b: MissingSeriesItem) => {
  const x = SORT_VALUE[key](a), y = SORT_VALUE[key](b);
  const byKey = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'th');
  return byKey || a.title.localeCompare(b.title, 'th');
};

const CHECKED_ITEMS_STORAGE_KEY = "manga-tracker:missing-checklist-checked";

function loadCheckedItems(): Set<string> {
  try {
    const raw = localStorage.getItem(CHECKED_ITEMS_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

// Pure derivation of the missing-volume checklist from store data. No persisted state, so it is
// safe to call from several places (e.g. the header counter) without duplicating checklist state.
export function useMissingList(): MissingSeriesItem[] {
  const series = useSeriesStore(s => s.series);
  return useMemo(() => {
    const list: MissingSeriesItem[] = [];
    series.forEach(s => {
      const stats = getSeriesDerivedStats(s);
      if (stats.n.isCollecting && !stats.n.isCollectingStopped && stats.isCollectMissing) {
        const formats: MissingLogItem[] = [];
        stats.n.collectionLogs.forEach(log => {
          if (log.isPartial) return;
          const missingText = getMissingVolumesText(log.ranges, log.totalVolumes);
          if (missingText !== 'ครบถ้วน' && missingText !== '-') {
            formats.push({ 
              id: log.id,
              format: log.format,
              title: getCollectionLogLabel(log), 
              missingText,
              missingCount: countMissingVolumes(log),
              // A missing log always has a known total (unknown-total logs are never "missing").
              totalVolumes: log.totalVolumes ?? 0
            });
          }
        });
        if (formats.length > 0) {
          list.push({ 
            _id: s._id,
            title: s.title, 
            author: s.author, 
            publisher: s.publisher || "ไม่ระบุสำนักพิมพ์", 
            typeStr: TYPE_LABEL[s.type] || s.type, 
            rawType: s.type, 
            formats,
            rawSeries: s 
          });
        }
      }
    });
    return list;
  }, [series]);
}

export function useMissingVolumes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPublisher, setSelectedPublisher] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grouped" | "list">("grouped");
  const [sortBy, setSortBy] = useState<ChecklistSortKey | ''>('');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  // Persisted across closing/reopening the modal — a shopping trip is rarely one
  // uninterrupted sitting, so "picked up" state needs to survive being interrupted.
  const [checkedItems, setCheckedItems] = useState<Set<string>>(loadCheckedItems);
  const [collapsedPubs, setCollapsedPubs] = useState<Set<string>>(new Set());

  // 1. Gather all series that have missing volumes
  const missingList = useMissingList();

  // 2. Filter list based on search and selected publisher, then apply the column sort
  const filteredList = useMemo(() => {
    const list = missingList.filter(item => {
      const matchSearch = 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.author && item.author.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.publisher && item.publisher.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchPublisher = selectedPublisher.length === 0 || selectedPublisher.includes(item.publisher);
      
      return matchSearch && matchPublisher;
    });
    if (!sortBy) return list;
    const dir = sortOrder === 'ASC' ? 1 : -1;
    return list.sort((a, b) => dir * compareItems(sortBy, a, b));
  }, [missingList, searchQuery, selectedPublisher, sortBy, sortOrder]);

  // 3. Unique publisher options for filter dropdown
  const publisherOptions = useMemo(() => {
    const pubs = new Set<string>();
    missingList.forEach(item => {
      if (item.publisher) pubs.add(item.publisher);
    });
    return Array.from(pubs).sort();
  }, [missingList]);

  // 4. Grouped missing items for Publisher view
  const groupedByPublisher = useMemo(() => {
    const groups: Record<string, MissingSeriesItem[]> = {};
    filteredList.forEach(item => {
      const pub = item.publisher || "ไม่ระบุสำนักพิมพ์";
      if (!groups[pub]) groups[pub] = [];
      groups[pub].push(item);
    });
    return groups;
  }, [filteredList]);

  // 5. Active dynamic statistics
  const stats = useMemo(() => {
    const totalSeries = filteredList.length;
    let totalVolumes = 0;
    let checkedVolumes = 0;
    let checkedItemsCount = 0;

    filteredList.forEach(item => {
      item.formats.forEach(f => {
        totalVolumes += f.missingCount;
        const key = `${item._id}-${f.id}`;
        if (checkedItems.has(key)) {
          checkedVolumes += f.missingCount;
          checkedItemsCount++;
        }
      });
    });

    return { totalSeries, totalVolumes, checkedVolumes, checkedItemsCount };
  }, [filteredList, checkedItems]);

  // Every currently-missing item, unfiltered — used to prune stale checks and to
  // detect "fully caught up" independent of whatever search/publisher filter is active.
  const allKeys = useMemo(() => {
    const keys = new Set<string>();
    missingList.forEach(item => item.formats.forEach(f => keys.add(`${item._id}-${f.id}`)));
    return keys;
  }, [missingList]);

  // Prunes checks for items no longer missing (e.g. the user edited a series directly
  // instead of shopping it off the checklist) whenever the underlying data changes. The
  // very first time real data becomes available, it also applies a one-time "fresh start":
  // if a previous session had checked off literally everything, that trip is over. This is
  // deliberately NOT re-evaluated on every later checkedItems change — resetting the instant
  // the user taps their last checkbox would wipe the fully-checked list right in front of
  // them, which reads as a bug rather than a fresh start. It only ever applies on next open.
  const startedFresh = useRef(false);
  useEffect(() => {
    if (allKeys.size === 0) return;
    const isFirstRun = !startedFresh.current;
    startedFresh.current = true;
    setCheckedItems(prev => {
      const pruned = new Set([...prev].filter(k => allKeys.has(k)));
      if (isFirstRun && pruned.size === allKeys.size) return new Set();
      return pruned.size === prev.size ? prev : pruned;
    });
  }, [allKeys]);

  useEffect(() => {
    try {
      localStorage.setItem(CHECKED_ITEMS_STORAGE_KEY, JSON.stringify([...checkedItems]));
    } catch {
      // localStorage unavailable (private mode, etc.) — checked state just won't persist.
    }
  }, [checkedItems]);

  const clearCheckedItems = () => setCheckedItems(new Set());

  const toggleCheckItem = (key: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleCollapsePub = (pub: string) => {
    const next = new Set(collapsedPubs);
    if (next.has(pub)) next.delete(pub);
    else next.add(pub);
    setCollapsedPubs(next);
  };

  return {
    searchQuery,
    setSearchQuery,
    selectedPublisher,
    setSelectedPublisher,
    viewMode,
    setViewMode,
    sortBy,
    sortOrder,
    setSort: (by: ChecklistSortKey, order: 'ASC' | 'DESC') => { setSortBy(by); setSortOrder(order); },
    checkedItems,
    toggleCheckItem,
    clearCheckedItems,
    collapsedPubs,
    toggleCollapsePub,
    missingList,
    filteredList,
    publisherOptions,
    groupedByPublisher,
    stats
  };
}

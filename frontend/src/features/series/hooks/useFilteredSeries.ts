import { useMemo } from "react";
import { getSeriesDerivedStats, countMissingVolumes, getLogLanguage } from "../../../utils/helpers";
import { Series, FilterState } from "../../../types";

// Total volumes still missing across every collection log — undefined when not collecting,
// so it can sort consistently to one end regardless of ASC/DESC.
function getMissingCount(s: Series): number | undefined {
  const stats = getSeriesDerivedStats(s);
  if (!stats.n.isCollecting || stats.n.isCollectingStopped) return undefined;
  return stats.n.collectionLogs.reduce((sum, log) => sum + countMissingVolumes(log), 0);
}

// Reading progress as a 0-1 ratio; undefined when the series has no known volume count yet.
function getReadProgress(s: Series): number | undefined {
  const stats = getSeriesDerivedStats(s);
  return stats.totalReadJP > 0 ? stats.totalReadCount / stats.totalReadJP : undefined;
}

export function useFilteredSeries(series: Series[], filter: FilterState) {
  const displaySeries = useMemo(() => {
    let filtered = [...series];

    if (filter.search) {
      const q = filter.search.toLowerCase();
      filtered = filtered.filter(s =>
        s.title.toLowerCase().includes(q) ||
        (s.author && s.author.toLowerCase().includes(q)) ||
        (s.publisher && s.publisher.toLowerCase().includes(q))
      );
    }
    
    if (filter.type && filter.type.length > 0) {
      filtered = filtered.filter(s => filter.type.includes(s.type));
    }
    if (filter.status && filter.status.length > 0) {
      filtered = filtered.filter(s => filter.status.includes(s.status));
    }
    
    if (filter.publisher.length > 0) {
      filtered = filtered.filter(s => filter.publisher.includes(s.publisher));
    }
    if (filter.yearFrom) filtered = filtered.filter(s => s.publishYear !== undefined && s.publishYear !== null && s.publishYear >= Number(filter.yearFrom));
    if (filter.yearTo) filtered = filtered.filter(s => s.publishYear !== undefined && s.publishYear !== null && s.publishYear <= Number(filter.yearTo));

    if (filter.unratedOnly) {
      filtered = filtered.filter(s => !s.rating || s.rating === 0);
    } else {
      if (filter.minRating) filtered = filtered.filter(s => (s.rating || 0) >= filter.minRating);
      if (filter.maxRating) filtered = filtered.filter(s => (s.rating || 0) <= filter.maxRating && (s.rating || 0) > 0);
    }

    filtered = filtered.filter(s => {
      const st = getSeriesDerivedStats(s);

      if (filter.language && filter.language.length > 0) {
        const ownsLanguage = st.n.isCollecting && st.n.collectionLogs.some(log =>
          log.ranges.length > 0 && filter.language.includes(getLogLanguage(log)));
        if (!ownsLanguage) return false;
      }
      
      if (filter.readStatus && filter.readStatus.length > 0) {
        let matchRead = false;
        const rs = filter.readStatus;
        if (rs.includes('finished') && st.isFinishedReading) matchRead = true;
        if (rs.includes('caughtup') && st.isCaughtUp) matchRead = true;
        if (rs.includes('reading') && st.isReading) matchRead = true;
        if (rs.includes('unread') && st.isUnread) matchRead = true;
        if (!matchRead) return false;
      }

      if (filter.collectStatus && filter.collectStatus.length > 0) {
        let matchCollect = false;
        const cs = filter.collectStatus;
        if (cs.includes('complete') && st.isCollectComplete) matchCollect = true;
        if (cs.includes('missing') && st.isCollectMissing) matchCollect = true;
        if (cs.includes('stopped') && st.isCollectStopped) matchCollect = true;
        if (cs.includes('not_collecting') && st.isNotCollecting) matchCollect = true;
        if (!matchCollect) return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      let valA = a[filter.sortBy as keyof Series];
      let valB = b[filter.sortBy as keyof Series];
      if (filter.sortBy === 'updatedAt' || filter.sortBy === 'createdAt') {
        valA = new Date(valA as string).getTime();
        valB = new Date(valB as string).getTime();
      }
      if (filter.sortBy === 'rating') {
        valA = a.rating || 0;
        valB = b.rating || 0;
      }
      if (filter.sortBy === 'readProgress') {
        valA = getReadProgress(a);
        valB = getReadProgress(b);
      }
      if (filter.sortBy === 'missingCount') {
        valA = getMissingCount(a);
        valB = getMissingCount(b);
      }
      // No value sorts last, and two of them tie (returning 1 both ways is not a valid comparator).
      if (valA === undefined || valA === null) return valB === undefined || valB === null ? 0 : 1;
      if (valB === undefined || valB === null) return -1;
      // Plain `<` orders by code unit, which puts Thai titles starting with เ/แ/โ/ใ/ไ after every other letter.
      if (typeof valA === 'string' && typeof valB === 'string') {
        const cmp = valA.localeCompare(valB, 'th');
        return filter.sortOrder === 'ASC' ? cmp : -cmp;
      }
      if (valA < valB) return filter.sortOrder === 'ASC' ? -1 : 1;
      if (valA > valB) return filter.sortOrder === 'ASC' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [series, filter]);

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (filter.search) c++;
    if (filter.type && filter.type.length > 0) c++;
    if (filter.status && filter.status.length > 0) c++;
    if (filter.publisher.length > 0) c++;
    if (filter.readStatus && filter.readStatus.length > 0) c++;
    if (filter.collectStatus && filter.collectStatus.length > 0) c++;
    if (filter.language && filter.language.length > 0) c++;
    if (filter.unratedOnly || filter.minRating || filter.maxRating) c++;
    if (filter.yearFrom) c++;
    if (filter.yearTo) c++;
    return c;
  }, [filter]);

  return { displaySeries, activeFilterCount };
}

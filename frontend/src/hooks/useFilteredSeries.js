import { useMemo } from "react";
import { getSeriesDerivedStats } from "../utils";

export function useFilteredSeries(series, filter) {
  const displaySeries = useMemo(() => {
    let filtered = series;

    if (filter.search) {
      const q = filter.search.toLowerCase();
      filtered = filtered.filter(s =>
        s.title.toLowerCase().includes(q) ||
        (s.author && s.author.toLowerCase().includes(q)) ||
        (s.publisher && s.publisher.toLowerCase().includes(q))
      );
    }
    
    if (filter.type && filter.type.length > 0) {
      filtered = filtered.filter(s => Array.isArray(filter.type) ? filter.type.includes(s.type) : filter.type === s.type);
    }
    if (filter.status && filter.status.length > 0) {
      filtered = filtered.filter(s => Array.isArray(filter.status) ? filter.status.includes(s.status) : filter.status === s.status);
    }
    
    if (filter.publisher) filtered = filtered.filter(s => s.publisher === filter.publisher);
    if (filter.yearFrom) filtered = filtered.filter(s => s.publishYear >= Number(filter.yearFrom));
    if (filter.yearTo) filtered = filtered.filter(s => s.publishYear <= Number(filter.yearTo));

    if (filter.minRating) filtered = filtered.filter(s => (s.rating || 0) >= filter.minRating);
    if (filter.maxRating) filtered = filtered.filter(s => (s.rating || 0) <= filter.maxRating && (s.rating || 0) > 0);

    filtered = filtered.filter(s => {
      const st = getSeriesDerivedStats(s);
      
      if (filter.readStatus && filter.readStatus.length > 0) {
        let matchRead = false;
        const rs = Array.isArray(filter.readStatus) ? filter.readStatus : [filter.readStatus];
        if (rs.includes('finished') && st.isFinishedReading) matchRead = true;
        if (rs.includes('caughtup') && st.isCaughtUp) matchRead = true;
        if (rs.includes('reading') && st.isReading) matchRead = true;
        if (rs.includes('unread') && st.isUnread) matchRead = true;
        if (!matchRead) return false;
      }

      if (filter.collectStatus && filter.collectStatus.length > 0) {
        let matchCollect = false;
        const cs = Array.isArray(filter.collectStatus) ? filter.collectStatus : [filter.collectStatus];
        if (cs.includes('complete') && st.isCollectComplete) matchCollect = true;
        if (cs.includes('missing') && st.isCollectMissing) matchCollect = true;
        if (cs.includes('not_collecting') && st.isNotCollecting) matchCollect = true;
        if (!matchCollect) return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      let valA = a[filter.sortBy];
      let valB = b[filter.sortBy];
      if (filter.sortBy === 'updatedAt' || filter.sortBy === 'createdAt') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }
      if (filter.sortBy === 'rating') {
        valA = a.rating || 0;
        valB = b.rating || 0;
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
    if (filter.publisher) c++;
    if (filter.readStatus && filter.readStatus.length > 0) c++;
    if (filter.collectStatus && filter.collectStatus.length > 0) c++;
    if (filter.minRating) c++;
    if (filter.maxRating) c++;
    if (filter.yearFrom) c++;
    if (filter.yearTo) c++;
    return c;
  }, [filter]);

  return { displaySeries, activeFilterCount };
}

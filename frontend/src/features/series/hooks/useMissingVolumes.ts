import { useState, useMemo } from "react";
import { useSeriesStore } from "../../../store/useSeriesStore";
import { getSeriesDerivedStats, getMissingVolumesText, getSetFromRanges } from "../../../utils/helpers";
import { FORMAT_LABEL, TYPE_LABEL } from "../../../utils/constants";
import { Series } from "../../../types";

export interface MissingLogItem {
  id: string;
  format?: string;
  title: string;
  missingText: string;
  missingCount: number;
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

export function useMissingVolumes() {
  const { series } = useSeriesStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPublisher, setSelectedPublisher] = useState("all");
  const [viewMode, setViewMode] = useState<"grouped" | "list">("grouped");
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [collapsedPubs, setCollapsedPubs] = useState<Set<string>>(new Set());

  // 1. Gather all series that have missing volumes
  const missingList = useMemo(() => {
    const list: MissingSeriesItem[] = [];
    series.forEach(s => {
      const stats = getSeriesDerivedStats(s);
      if (stats.n.isCollecting && stats.isCollectMissing) {
        const formats: MissingLogItem[] = [];
        stats.n.collectionLogs.forEach(log => {
          const missingText = getMissingVolumesText(log.ranges, log.totalVolumes);
          if (missingText !== 'ครบถ้วน' && missingText !== '-') {
            const boughtCount = getSetFromRanges(log.ranges).size;
            const limit = Number(log.totalVolumes) || 0;
            const count = Math.max(0, limit - boughtCount);

            formats.push({ 
              id: log.id,
              format: log.format,
              title: log.title || FORMAT_LABEL[log.format || 'normal'] || 'เล่มปกติ', 
              missingText,
              missingCount: count
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

  // 2. Filter list based on search and selected publisher
  const filteredList = useMemo(() => {
    return missingList.filter(item => {
      const matchSearch = 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.author && item.author.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.publisher && item.publisher.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchPublisher = selectedPublisher === "all" || item.publisher === selectedPublisher;
      
      return matchSearch && matchPublisher;
    });
  }, [missingList, searchQuery, selectedPublisher]);

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

  const toggleCheckItem = (key: string) => {
    const next = new Set(checkedItems);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setCheckedItems(next);
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
    checkedItems,
    toggleCheckItem,
    collapsedPubs,
    toggleCollapsePub,
    missingList,
    filteredList,
    publisherOptions,
    groupedByPublisher,
    stats
  };
}

export type VolumeRange = [number, number];

export interface BookLog {
  id: string;
  title: string;
  totalVolumes: number | null;
  ranges: VolumeRange[];
  format?: string; // Specific to collection logs in UI
}

export type SeriesType = 'manga' | 'novel' | 'light_novel';
export type SeriesStatus = 'ongoing' | 'completed' | 'hiatus' | 'cancelled';

export interface Series {
  _id: string;
  id: number;
  title: string;
  author: string;
  publisher: string;
  type: SeriesType;
  publishYear?: number | null;
  endYear?: number | null;
  status: SeriesStatus;
  isCollecting: boolean;
  rating: number;
  imageUrl?: string;
  notes?: string;
  readingLogs: BookLog[];
  collectionLogs: BookLog[];
  createdAt?: string;
  updatedAt?: string;

  // Legacy fallback fields (used during normalization)
  totalVolumes?: number;
  readRanges?: VolumeRange[];
  boughtFormat?: string;
  thaiLatestVolume?: number;
  boughtRanges?: VolumeRange[];
}

export interface SeriesStats {
  byType: { _id: string; count: number }[];
  byStatus: { _id: string; count: number }[];
  totals: {
    totalSeries: number;
    collecting: number;
    totalRead: number;
  };
}

export interface FilterState {
  search: string;
  type: SeriesType[];
  status: SeriesStatus[];
  publisher: string;
  readStatus: string[];
  collectStatus: string[];
  minRating: number;
  maxRating: number;
  yearFrom: string | number;
  yearTo: string | number;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
  limit?: number;
}

export interface SeriesDerivedStats {
  n: Series;
  totalReadJP: number;
  totalReadCount: number;
  isAllRead: boolean;
  isFinishedReading: boolean;
  isCaughtUp: boolean;
  isReading: boolean;
  isUnread: boolean;
  isCollectMissing: boolean;
  isCollectComplete: boolean;
  isNotCollecting: boolean;
}

export interface MetadataItem {
  id: number;
  name: string;
}

export interface SeriesStore {
  series: Series[];
  stats: SeriesStats | null;
  loading: boolean;
  viewMode: 'grid' | 'list';
  authors: MetadataItem[];
  publishers: MetadataItem[];
  filter: FilterState;
  setViewMode: (mode: 'grid' | 'list') => void;
  fetchSeries: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchMetadata: () => Promise<void>;
  setFilter: (f: Partial<FilterState>) => void;
  resetFilter: () => void;
  updateSeriesRating: (id: string, rating: number) => Promise<void>;
  deleteSeries: (id: string) => Promise<void>;
}

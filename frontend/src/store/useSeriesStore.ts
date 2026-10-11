import { create } from "zustand";
import toast from "react-hot-toast";
import { seriesApi } from "../api/seriesApi";
import { SeriesStore, FilterState, CardLayout } from "../types";
import { CARD_LAYOUT_LABEL } from "../utils/constants";

const CARD_LAYOUT_STORAGE_KEY = 'cardLayout';

// The grid card layout is a per-browser preference; storage may be unavailable (private mode).
const loadCardLayout = (): CardLayout => {
  try {
    const saved = localStorage.getItem(CARD_LAYOUT_STORAGE_KEY);
    if (saved && saved in CARD_LAYOUT_LABEL) return saved as CardLayout;
  } catch { /* fall through to the default */ }
  return 'cover';
};

export const EMPTY_FILTER: FilterState = {
  search: '',
  type: [],
  status: [],
  publisher: [],
  readStatus: [],
  collectStatus: [],
  language: [],
  minRating: 0,
  maxRating: 0,
  unratedOnly: false,
  yearFrom: '',
  yearTo: '',
  sortBy: 'updatedAt',
  sortOrder: 'DESC',
};

export const useSeriesStore = create<SeriesStore>((set, get) => ({
  series: [],
  stats: null,
  loading: false,
  viewMode: 'grid',
  cardLayout: loadCardLayout(),
  authors: [],
  publishers: [],
  filter: { ...EMPTY_FILTER, limit: 1000 },
  
  setViewMode: (mode) => set({ viewMode: mode }),
  setCardLayout: (layout) => {
    set({ cardLayout: layout });
    try { localStorage.setItem(CARD_LAYOUT_STORAGE_KEY, layout); } catch { /* not persisted */ }
  },
  
  fetchSeries: async () => {
    set({ loading: true });
    try {
      const res = await seriesApi.getAll({ limit: get().filter.limit });
      set({ series: res.data.data });
    } catch (err) {
      toast.error("ดึงข้อมูลซีรีส์ไม่สำเร็จ");
    } finally {
      set({ loading: false });
    }
  },
  
  fetchStats: async () => {
    try {
      const res = await seriesApi.getStats();
      set({ stats: res.data });
    } catch (err) {
      toast.error("ดึงข้อมูลสถิติไม่สำเร็จ");
    }
  },

  fetchMetadata: async () => {
    try {
      const [authors, publishers] = await Promise.all([
        seriesApi.getAuthors(),
        seriesApi.getPublishers()
      ]);
      set({ authors: authors.data, publishers: publishers.data });
    } catch (err) {
      toast.error("ดึงข้อมูลผู้แต่ง/สำนักพิมพ์ไม่สำเร็จ");
    }
  },
  
  setFilter: (f) => set((s) => ({ filter: { ...s.filter, ...f } })),
  resetFilter: () => set(({ filter: { ...EMPTY_FILTER, limit: 1000 } })),
  
  updateSeriesRating: async (id, rating) => {
    try {
      // The server bumps updatedAt on every edit; take it from the reply so "recently updated" order follows.
      const { data } = await seriesApi.update(id, { rating });
      set((s) => ({
        series: s.series.map(item => item._id === id ? { ...item, rating, updatedAt: data.updatedAt } : item)
      }));
    } catch {
      toast.error("บันทึก rating ไม่สำเร็จ");
    }
  },
  
  deleteSeries: async (id) => {
    try {
      await seriesApi.delete(id);
      get().fetchSeries(); 
      get().fetchStats();
      get().fetchMetadata();
      toast.success("ลบสำเร็จ");
    } catch {
      toast.error("ลบไม่สำเร็จ");
    }
  },
}));

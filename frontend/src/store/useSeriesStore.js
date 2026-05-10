import { create } from "zustand";
import toast from "react-hot-toast";
import { seriesApi } from "../api/seriesApi";

export const EMPTY_FILTER = {
  search: '', type: [], status: [], publisher: '', readStatus: [], collectStatus: [],
  minRating: 0, maxRating: 0, yearFrom: '', yearTo: '',
  sortBy: 'updatedAt', sortOrder: 'DESC',
};

export const useSeriesStore = create((set, get) => ({
  series: [], stats: null, loading: false, viewMode: 'grid',
  authors: [], publishers: [],
  filter: { ...EMPTY_FILTER, limit: 1000 },
  setViewMode: (mode) => set({ viewMode: mode }),
  
  fetchSeries: async () => {
    set({ loading: true });
    try {
      const res = await seriesApi.getAll({ limit: get().filter.limit });
      set({ series: res.data.data });
    } catch (err) {
      toast.error("ดึงข้อมูลซีรีส์ไม่สำเร็จ");
    } finally { set({ loading: false }); }
  },
  
  fetchStats: async () => {
    try {
      const res = await seriesApi.getStats();
      set({ stats: res.data });
    } catch (err) {}
  },
  
  fetchMetadata: async () => {
    try {
      const [authors, publishers] = await Promise.all([
        seriesApi.getAuthors(),
        seriesApi.getPublishers()
      ]);
      set({ authors: authors.data, publishers: publishers.data });
    } catch (err) {}
  },
  
  setFilter: (f) => set((s) => ({ filter: { ...s.filter, ...f } })),
  resetFilter: () => set((s) => ({ filter: { ...EMPTY_FILTER, limit: 1000 } })),
  
  updateSeriesRating: async (id, rating) => {
    try {
      await seriesApi.update(id, { rating });
      set((s) => ({
        series: s.series.map(item => item._id === id ? { ...item, rating } : item)
      }));
    } catch { toast.error("บันทึก rating ไม่สำเร็จ"); }
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

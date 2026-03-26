import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { create } from "zustand";
import toast, { Toaster } from "react-hot-toast";

// ==========================================
// 1. Constants & Icons
// ==========================================
const TYPE_LABEL = { manga: "Manga", novel: "Novel", light_novel: "Light Novel" };
const STATUS_LABEL = { ongoing: "ยังไม่จบ", completed: "จบแล้ว", hiatus: "หยุดตีพิมพ์ชั่วคราว", cancelled: "โดนตัดจบ" };
const FORMAT_LABEL = { normal: "เล่มปกติ", bigbook: "Bigbook", pocket: "Pocket Book", digital: "E-Book", omnibus: "Omnibus" };
const RATING_LABEL = { 0: "—", 1: "★ แย่", 2: "★★ พอใช้", 3: "★★★ ดี", 4: "★★★★ ดีมาก", 5: "★★★★★ ยอดเยี่ยม" };

const Icons = {
  Book: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>,
  Cart: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>,
  Info: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>,
  Edit: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  Grid: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
  List: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>,
  SortAsc: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>,
  SortDesc: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>,
  Filter: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>,
  Star: ({ filled, half, id = Math.random().toString(36).substr(2, 9) }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {half && (
        <clipPath id={`half-${id}`}>
          <rect x="0" y="0" width="12" height="24" />
        </clipPath>
      )}
      {half && <polygon fill="none" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>}
      <polygon fill={filled || half ? "currentColor" : "none"} clipPath={half ? `url(#half-${id})` : "none"} points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
  ),
  Receipt: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"></path><line x1="16" y1="8" x2="8" y2="8"></line><line x1="16" y1="12" x2="8" y2="12"></line><line x1="10" y1="16" x2="8" y2="16"></line></svg>,
  Copy: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>,

  Search: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  X: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  ChevronDown: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>,
  Sliders: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>,
  CheckCircle: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>,
  BookOpen: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>,
  Archive: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>,
  Sparkles: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>,
  Ban: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>,
  Clock: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
};

// ==========================================
// 2. API & Store
// ==========================================
const api = axios.create({ baseURL: "/api" });
const seriesApi = {
  getAll: (f) => api.get("/series", { params: f }),
  getStats: () => api.get("/series/stats"),
  create: (d) => api.post("/series", d),
  update: (id, d) => api.patch(`/series/${id}`, d),
  delete: (id) => api.delete(`/series/${id}`),
};

const EMPTY_FILTER = {
  search: '', type: [], status: [], publisher: '', readStatus: [], collectStatus: [],
  minRating: 0, maxRating: 0, yearFrom: '', yearTo: '',
  sortBy: 'updatedAt', sortOrder: 'DESC',
};

const useSeriesStore = create((set, get) => ({
  series: [], stats: null, loading: false, viewMode: 'grid',
  filter: { ...EMPTY_FILTER, limit: 1000 },
  setViewMode: (mode) => set({ viewMode: mode }),
  fetchSeries: async () => {
    set({ loading: true });
    try {
      const res = await seriesApi.getAll({ limit: get().filter.limit });
      set({ series: res.data.data });
    } finally { set({ loading: false }); }
  },
  fetchStats: async () => {
    try {
      const res = await seriesApi.getStats();
      set({ stats: res.data });
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
    await seriesApi.delete(id);
    get().fetchSeries(); get().fetchStats();
  },
}));

// ==========================================
// 3. Helpers & Data Migration
// ==========================================
function getSetFromRanges(ranges) {
  const set = new Set();
  if (ranges && Array.isArray(ranges)) ranges.forEach(([s, e]) => { for (let i = s; i <= e; i++) set.add(i); });
  return set;
}

function getMissingVolumesText(ranges, limitVolume) {
  if (!limitVolume || limitVolume <= 0) return "-";
  const boughtSet = getSetFromRanges(ranges);
  const missing = [];
  for (let i = 1; i <= limitVolume; i++) { if (!boughtSet.has(i)) missing.push(i); }
  if (missing.length === 0) return "ครบถ้วน";
  const grouped = [];
  let start = missing[0], end = missing[0];
  for (let i = 1; i < missing.length; i++) {
    if (missing[i] === end + 1) end = missing[i];
    else { grouped.push(start === end ? `${start}` : `${start}-${end}`); start = missing[i]; end = missing[i]; }
  }
  grouped.push(start === end ? `${start}` : `${start}-${end}`);
  return grouped.join(", ");
}

function normalizeSeriesData(series) {
  if (!series) return null;
  const n = { ...series };
  if (!n.readingLogs || n.readingLogs.length === 0) {
    n.readingLogs = [{ id: 'm1', title: 'ภาคหลัก', totalVolumes: series.totalVolumes || 0, ranges: series.readRanges || [] }];
  }
  if (!n.collectionLogs || n.collectionLogs.length === 0) {
    n.collectionLogs = [{ id: 'c1', format: series.boughtFormat || 'normal', title: 'เล่มปกติ', totalVolumes: series.thaiLatestVolume || 0, ranges: series.boughtRanges || [] }];
  }
  return n;
}

function getSeriesDerivedStats(series) {
  const n = normalizeSeriesData(series);
  const totalReadJP = n.readingLogs.reduce((sum, log) => sum + (Number(log.totalVolumes) || 0), 0);
  const totalReadCount = n.readingLogs.reduce((sum, log) => sum + getSetFromRanges(log.ranges).size, 0);
  const isAllRead = totalReadCount >= totalReadJP && totalReadJP > 0;
  const isFinishedReading = n.status === 'completed' && isAllRead;
  const isCaughtUp = n.status !== 'completed' && isAllRead;
  const isReading = totalReadCount > 0 && !isAllRead;
  const isUnread = totalReadCount === 0;
  let isCollectMissing = false, isCollectComplete = false;
  const isNotCollecting = !n.isCollecting;
  if (n.isCollecting) {
    const hasMissing = n.collectionLogs.some(log => getMissingVolumesText(log.ranges, log.totalVolumes) !== 'ครบถ้วน');
    isCollectMissing = hasMissing;
    isCollectComplete = !hasMissing;
  }
  return { n, totalReadJP, totalReadCount, isAllRead, isFinishedReading, isCaughtUp, isReading, isUnread, isCollectMissing, isCollectComplete, isNotCollecting };
}

// ==========================================
// 4. Star Rating Component (รองรับ .5 ดาว)
// ==========================================
function StarRating({ rating = 0, onRate, size = 'sm', readOnly = false }) {
  const [hover, setHover] = useState(0);
  const display = hover || rating;

  const handleMouseMove = (e, n) => {
    if (readOnly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isHalf = e.clientX - rect.left < rect.width / 2;
    setHover(isHalf ? n - 0.5 : n);
  };

  const getRatingText = (r) => {
    if (r >= 4.5) return "ยอดเยี่ยม";
    if (r >= 3.5) return "ดีมาก";
    if (r >= 2.5) return "ดี";
    if (r >= 1.5) return "พอใช้";
    if (r > 0) return "แย่";
    return "";
  };

  return (
    <div className={`star-rating star-rating--${size} ${readOnly ? 'star-rating--readonly' : ''}`}
      onMouseLeave={() => !readOnly && setHover(0)}>
      {[1, 2, 3, 4, 5].map(n => {
        const isFilled = display >= n;
        const isHalf = display === n - 0.5;
        return (
          <button
            key={n}
            className={`star-btn ${isFilled || isHalf ? 'filled' : ''}`}
            onMouseMove={(e) => handleMouseMove(e, n)}
            onClick={(e) => { 
              if (!readOnly && onRate) { 
                e.stopPropagation(); 
                const val = display;
                onRate(val === rating ? 0 : val); 
              } 
            }}
            title={readOnly ? `${rating} ดาว` : `ให้ ${display} ดาว`}
          >
            <Icons.Star filled={isFilled} half={isHalf} id={`star-${n}`} />
          </button>
        );
      })}
      {!readOnly && rating > 0 && (
        <span className="star-label">{rating} ดาว {getRatingText(rating) && `(${getRatingText(rating)})`}</span>
      )}
    </div>
  );
}

// ==========================================
// 5. Progress Bar
// ==========================================
function AggregatedVolumeBar({ logs, type, icon: Icon, titleLabel, isMini = false }) {
  if (!logs || logs.length === 0) return null;
  const totalVolumes = logs.reduce((sum, log) => sum + (Number(log.totalVolumes) || 0), 0);
  let count = 0;
  const gridCells = [];
  logs.forEach((log, logIndex) => {
    const set = getSetFromRanges(log.ranges);
    count += set.size;
    for (let i = 1; i <= (Number(log.totalVolumes) || 0); i++) {
      gridCells.push({ id: `${logIndex}-${i}`, isFilled: set.has(i), isSpecial: logIndex > 0, logIndex });
    }
  });
  const percent = totalVolumes > 0 ? Math.min(Math.round((count / totalVolumes) * 100), 100) : 0;
  const progressColor = type === 'read' ? 'var(--read-color)' : 'var(--buy-color)';
  return (
    <div className={`progress-item ${isMini ? 'progress-item--mini' : ''}`} style={!isMini ? { marginTop: type === 'buy' ? '8px' : '0', paddingTop: type === 'buy' ? '8px' : '0', borderTop: type === 'buy' ? '1px dashed var(--border)' : 'none' } : {}}>
      <div className="progress-info">
        <span className="progress-label"><Icon /> {titleLabel}: {count}/{totalVolumes || '?'}</span>
        <span className="progress-percent">{percent}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${percent}%`, background: progressColor, boxShadow: `0 0 8px ${progressColor}40` }}></div>
      </div>
      <div className="vbar-mini-grid">
        {gridCells.map((cell, idx) => {
          const isNextDifferentLog = idx < gridCells.length - 1 && gridCells[idx + 1].logIndex !== cell.logIndex;
          let cellClass = "";
          if (type === 'read') cellClass = cell.isFilled ? (cell.isSpecial ? "read special" : "read") : (cell.isSpecial ? "special" : "");
          else cellClass = cell.isFilled ? (cell.isSpecial ? "bought special" : "bought") : (cell.isSpecial ? "special" : "");
          return (
            <React.Fragment key={cell.id}>
              <div className="vbar-mini-cell-wrap"><div className={`vbar-mini-cell ${cellClass}`} /></div>
              {isNextDifferentLog && <div className="vbar-mini-gap" />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// 6. Range Editor
// ==========================================
function RangeEditor({ ranges, onChange, label = "ช่วงเล่ม" }) {
  const [s, setS] = useState(""), [e, setE] = useState("");
  const add = () => {
    if (s && e) {
      const start = Number(s), end = Number(e);
      if (start > end) { toast.error("เล่มเริ่มต้นต้องน้อยกว่าเล่มจบ"); return; }
      onChange([...ranges, [start, end]]); setS(""); setE("");
    }
  };
  return (
    <div className="range-editor">
      <div className="range-list">
        {ranges.map((r, i) => (
          <span key={i} className="range-tag">
            <span className="badge badge--novel">{r[0] === r[1] ? r[0] : `${r[0]}-${r[1]}`}</span>
            <button className="btn-icon btn-icon--danger" onClick={() => onChange(ranges.filter((_, idx) => idx !== i))}>✕</button>
          </span>
        ))}
      </div>
      <div className="range-inputs field-row" style={{ marginTop: '6px' }}>
        <input className="input input--num" type="number" value={s} onChange={x => setS(x.target.value)} placeholder="เริ่ม" />
        <span className="range-row__sep">–</span>
        <input className="input input--num" type="number" value={e} onChange={x => setE(x.target.value)} placeholder="จบ" />
        <button className="btn btn--sm btn--ghost" onClick={add}>เพิ่ม</button>
      </div>
    </div>
  );
}

// ==========================================
// 7. Series Info Modal
// ==========================================
function SeriesInfoModal({ series, onClose }) {
  const isEdit = !!series;
  const normSeries = normalizeSeriesData(series);
  const initialState = {
    title: normSeries?.title || "", author: normSeries?.author || "", publisher: normSeries?.publisher || "",
    publishYear: normSeries?.publishYear || "", endYear: normSeries?.endYear || "",
    type: normSeries?.type || "manga", status: normSeries?.status || "ongoing",
    isCollecting: normSeries?.isCollecting ?? true,
    rating: normSeries?.rating || 0,
    readingLogs: normSeries?.readingLogs || [{ id: Date.now().toString(), title: "ภาคหลัก", totalVolumes: "", ranges: [] }],
    collectionLogs: normSeries?.collectionLogs || [{ id: Date.now().toString(), format: "normal", title: "เล่มปกติ", totalVolumes: "", ranges: [] }]
  };
  const [form, setForm] = useState(initialState);
  const { fetchSeries, fetchStats } = useSeriesStore();

  const updateLog = (key, idx, field, val) => {
    const newList = [...form[key]]; newList[idx][field] = val;
    setForm({ ...form, [key]: newList });
  };
  const handleStatusChange = (e) => {
    const val = e.target.value;
    if (val === 'ongoing' || val === 'hiatus') setForm({ ...form, status: val, endYear: "" });
    else setForm({ ...form, status: val });
  };
  const save = async () => {
    if (!form.title || form.title.toString().trim() === "") return toast.error("กรุณากรอกชื่อเรื่อง");
    if (!form.author || form.author.toString().trim() === "") return toast.error("กรุณากรอกผู้แต่ง");
    if (!form.publisher || form.publisher.toString().trim() === "") return toast.error("กรุณากรอกสำนักพิมพ์");
    if (!form.publishYear) return toast.error("กรุณากรอกปีที่พิมพ์");
    if ((form.status === 'completed' || form.status === 'cancelled') && !form.endYear) return toast.error("กรุณากรอกปีที่จบด้วยครับ");
    try {
      const payload = {
        ...form,
        publishYear: form.publishYear ? Number(form.publishYear) : null,
        endYear: form.endYear ? Number(form.endYear) : null,
        readingLogs: form.readingLogs.map(l => ({ ...l, totalVolumes: l.totalVolumes ? Number(l.totalVolumes) : null })),
        collectionLogs: form.collectionLogs.map(l => ({ ...l, totalVolumes: l.totalVolumes ? Number(l.totalVolumes) : null }))
      };
      if (isEdit && series) await seriesApi.update(series._id, payload);
      else await seriesApi.create(payload);
      await Promise.all([fetchSeries(), fetchStats()]);
      toast.success("บันทึกสำเร็จ"); onClose();
    } catch { toast.error("เกิดข้อผิดพลาด"); }
  };

  return createPortal(
    <div className="modal-overlay">
      <div className={`modal ${isEdit ? "modal--edit" : "modal--add"}`}>
        <div className="modal__header">
          <h2 className="modal__title">{isEdit ? "แก้ไขข้อมูล" : "เพิ่มเรื่องใหม่"}</h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="modal__body">
          <div className="form-section">
            <h3 className="form-section__title"><Icons.Info /> ข้อมูลพื้นฐาน</h3>
            <div className="field"><span>ชื่อเรื่อง <span className="danger">*</span></span><input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div className="field-row">
              <div className="field"><span>ผู้แต่ง <span className="danger">*</span></span><input className="input" value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} /></div>
              <div className="field"><span>สำนักพิมพ์ <span className="danger">*</span></span><input className="input" value={form.publisher} onChange={e => setForm({ ...form, publisher: e.target.value })} /></div>
            </div>
            <div className="field-row">
              <div className="field"><span>ปีที่พิมพ์ <span className="danger">*</span></span><input type="number" className="input" value={form.publishYear} onChange={e => setForm({ ...form, publishYear: e.target.value })} /></div>
              {(form.status === 'completed' || form.status === 'cancelled') && (
                <div className="field"><span>ปีที่จบ <span className="danger">*</span></span><input type="number" className="input" value={form.endYear} onChange={e => setForm({ ...form, endYear: e.target.value })} /></div>
              )}
            </div>
            <div className="field-row">
              <div className="field"><span>ประเภท</span><select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="manga">Manga</option><option value="novel">Novel</option><option value="light_novel">Light Novel</option></select></div>
              <div className="field"><span>สถานะ</span><select className="input" value={form.status} onChange={handleStatusChange}><option value="ongoing">ยังไม่จบ</option><option value="completed">จบแล้ว</option><option value="hiatus">หยุดตีพิมพ์ชั่วคราว</option><option value="cancelled">โดนตัดจบ</option></select></div>
            </div>
            <div className="field">
              <span>คะแนนส่วนตัว</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
                <StarRating rating={form.rating} onRate={(r) => setForm({ ...form, rating: r })} size="lg" />
                {form.rating > 0 && <span style={{ fontSize: '.8rem', color: 'var(--muted)' }}>{RATING_LABEL[form.rating]}</span>}
              </div>
            </div>
          </div>

          <div className="form-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <h3 className="form-section__title" style={{ border: 'none', padding: 0, margin: 0 }}><Icons.Book /> บันทึกการอ่าน</h3>
              <button className="btn btn--sm btn--ghost" onClick={() => setForm({ ...form, readingLogs: [...form.readingLogs, { id: Date.now().toString(), title: "", totalVolumes: "", ranges: [] }] })}>+ เพิ่มชุดการอ่าน</button>
            </div>
            {form.readingLogs.map((log, idx) => (
              <div key={log.id} className="log-editor-box">
                {form.readingLogs.length > 1 && <button className="btn-icon btn-icon--danger log-editor-box__remove" onClick={() => setForm({ ...form, readingLogs: form.readingLogs.filter((_, i) => i !== idx) })}><Icons.Trash /></button>}
                <div className="field-row" style={{ marginBottom: '8px', paddingRight: '30px' }}>
                  <div className="field" style={{ flex: 2 }}><span>ชื่อชุด/ภาค</span><input className="input" value={log.title} onChange={e => updateLog('readingLogs', idx, 'title', e.target.value)} placeholder="เช่น ภาคหลัก" /></div>
                  <div className="field" style={{ flex: 1 }}><span>ทั้งหมด (เล่ม)</span><input type="number" className="input" value={log.totalVolumes} onChange={e => updateLog('readingLogs', idx, 'totalVolumes', e.target.value)} /></div>
                </div>
                <div className="field"><span>ช่วงที่อ่านแล้ว</span><RangeEditor ranges={log.ranges} onChange={r => updateLog('readingLogs', idx, 'ranges', r)} /></div>
              </div>
            ))}
          </div>

          <div className="form-section">
            <div className="field" style={{ marginBottom: '8px', padding: '12px', background: 'var(--cream)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <label className="field-checkbox"><input type="checkbox" checked={form.isCollecting} onChange={e => setForm({ ...form, isCollecting: e.target.checked })} /><strong>เก็บสะสมเรื่องนี้ (Physical / E-Book)</strong></label>
            </div>
            {form.isCollecting && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                  <h3 className="form-section__title" style={{ border: 'none', padding: 0, margin: 0, fontSize: '1rem' }}><Icons.Cart /> รูปแบบที่สะสม</h3>
                  <button className="btn btn--sm btn--ghost" onClick={() => setForm({ ...form, collectionLogs: [...form.collectionLogs, { id: Date.now().toString(), format: "normal", title: "", totalVolumes: "", ranges: [] }] })}>+ เพิ่มรูปแบบ</button>
                </div>
                {form.collectionLogs.map((log, idx) => (
                  <div key={log.id} className="log-editor-box log-editor-box--alt">
                    {form.collectionLogs.length > 1 && <button className="btn-icon btn-icon--danger log-editor-box__remove" onClick={() => setForm({ ...form, collectionLogs: form.collectionLogs.filter((_, i) => i !== idx) })}><Icons.Trash /></button>}
                    <div className="field-row" style={{ marginBottom: '8px', paddingRight: '30px' }}>
                      <div className="field" style={{ flex: 1 }}><span>รูปแบบ</span><select className="input" value={log.format} onChange={e => updateLog('collectionLogs', idx, 'format', e.target.value)}>{Object.entries(FORMAT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                      <div className="field" style={{ flex: 2 }}><span>ชื่อเรียก/หมายเหตุ</span><input className="input" value={log.title} onChange={e => updateLog('collectionLogs', idx, 'title', e.target.value)} /></div>
                      <div className="field" style={{ flex: 1 }}><span>ทั้งหมด (เล่ม)</span><input type="number" className="input" value={log.totalVolumes} onChange={e => updateLog('collectionLogs', idx, 'totalVolumes', e.target.value)} /></div>
                    </div>
                    <div className="field"><span>ช่วงที่เก็บแล้ว</span><RangeEditor ranges={log.ranges} onChange={r => updateLog('collectionLogs', idx, 'ranges', r)} /></div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
        <div className="modal__footer">
          <button className="btn btn--ghost" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn--save" onClick={save}>บันทึกทั้งหมด</button>
        </div>
      </div>
    </div>, document.body
  );
}

// ==========================================
// 8. Series Cards & List Items
// ==========================================
function SeriesCard({ series }) {
  const [showEdit, setShowEdit] = useState(false);
  const { deleteSeries, updateSeriesRating } = useSeriesStore(s => ({ deleteSeries: s.deleteSeries, updateSeriesRating: s.updateSeriesRating }));
  const stats = getSeriesDerivedStats(series);

  const renderTimeline = () => {
    const s = stats.n.publishYear || "?";
    if (stats.n.status === 'completed' || stats.n.endYear) return `${s} – ${stats.n.endYear || "จบแล้ว"}`;
    return `${s} – ปัจจุบัน`;
  };

  return (
    <div className="card">
      <div className="card__header">
        <div className="card__badges">
          <span className={`badge badge--${stats.n.type}`}>{TYPE_LABEL[stats.n.type]}</span>
          <span className={`badge badge--${stats.n.status}`}>{STATUS_LABEL[stats.n.status]}</span>
          {stats.isFinishedReading && <span className="badge badge--finished">อ่านจบแล้ว</span>}
          {stats.isCaughtUp && <span className="badge badge--caughtup">ทันปัจจุบัน</span>}
          {stats.totalReadCount > 0 && stats.n.isCollecting && <span className="badge badge--both">ทั้งอ่านทั้งเก็บ</span>}
          {stats.totalReadCount > 0 && !stats.n.isCollecting && <span className="badge badge--read-only">อ่านอย่างเดียว</span>}
          {stats.isUnread && stats.n.isCollecting && <span className="badge badge--collect-only">สายดอง</span>}
        </div>
        <div className="card__actions">
          <button className="btn-icon" title="แก้ไข" onClick={() => setShowEdit(true)}><Icons.Edit /></button>
          <button className="btn-icon btn-icon--danger" title="ลบ" onClick={() => window.confirm(`ลบ "${stats.n.title}"?`) && deleteSeries(stats.n._id)}><Icons.Trash /></button>
        </div>
      </div>
      <div className="card__body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
          <h3 className="card__title" title={stats.n.title}>{stats.n.title}</h3>
          <span className="card__timeline-label">{renderTimeline()}</span>
        </div>
        <p className="card__author">{stats.n.author || "?"} {stats.n.publisher ? `| ${stats.n.publisher}` : ""}</p>

        <div className="card__rating">
          <StarRating
            rating={stats.n.rating || 0}
            onRate={(r) => updateSeriesRating(stats.n._id, r)}
          />
        </div>

        <div className="volume-progress">
          <AggregatedVolumeBar logs={stats.n.readingLogs} type="read" icon={Icons.Book} titleLabel="การอ่าน (JP/Global)" />
          {stats.n.isCollecting && <AggregatedVolumeBar logs={stats.n.collectionLogs} type="buy" icon={Icons.Cart} titleLabel="การสะสม (ไทย)" />}
        </div>

        <div className="card__summary">
          <p style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Icons.Book /> <strong>อ่านแล้ว:</strong> เล่ม {stats.totalReadCount}/{stats.totalReadJP || '?'}</p>
          {stats.n.isCollecting ? (
            stats.n.collectionLogs.map(log => {
              const missingText = getMissingVolumesText(log.ranges, log.totalVolumes);
              const isComplete = missingText === 'ครบถ้วน';
              return (
                <p key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icons.Cart /> <strong>{isComplete ? 'สะสมครบ' : 'ขาด'} ({log.title || FORMAT_LABEL[log.format]}):</strong>
                  <span style={{ color: isComplete ? "var(--read-color)" : "var(--accent)", fontWeight: 'bold' }}>{missingText}</span>
                </p>
              );
            })
          ) : <p style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Icons.Cart /> <strong>สถานะ:</strong> อ่านอย่างเดียว</p>}
        </div>
      </div>
      {showEdit && <SeriesInfoModal series={stats.n} onClose={() => setShowEdit(false)} />}
    </div>
  );
}

function SeriesListItem({ series }) {
  const [showEdit, setShowEdit] = useState(false);
  const { deleteSeries, updateSeriesRating } = useSeriesStore(s => ({ deleteSeries: s.deleteSeries, updateSeriesRating: s.updateSeriesRating }));
  const stats = getSeriesDerivedStats(series);

  const renderTimeline = () => {
    const s = stats.n.publishYear || "?";
    if (stats.n.status === 'completed' || stats.n.endYear) return `${s} – ${stats.n.endYear || "จบแล้ว"}`;
    return `${s} – ปัจจุบัน`;
  };

  return (
    <div className="list-row">
      <div className="list-row__info">
        <div className="list-row__title-wrap">
          <h3 className="list-row__title" title={stats.n.title}>{stats.n.title}</h3>
          <span className="list-row__timeline">{renderTimeline()}</span>
        </div>
        <p className="list-row__author">{stats.n.author || "?"} {stats.n.publisher ? `| ${stats.n.publisher}` : ""}</p>
        <StarRating rating={stats.n.rating || 0} onRate={(r) => updateSeriesRating(stats.n._id, r)} size="xs" />
      </div>

      <div className="list-row__badges">
        <span className={`badge badge--${stats.n.type}`}>{TYPE_LABEL[stats.n.type]}</span>
        <span className={`badge badge--${stats.n.status}`}>{STATUS_LABEL[stats.n.status]}</span>
        {stats.isFinishedReading && <span className="badge badge--finished">อ่านจบแล้ว</span>}
        {stats.isCaughtUp && <span className="badge badge--caughtup">ทันปัจจุบัน</span>}
        {stats.totalReadCount > 0 && stats.n.isCollecting && <span className="badge badge--both">ทั้งอ่านทั้งเก็บ</span>}
        {stats.totalReadCount > 0 && !stats.n.isCollecting && <span className="badge badge--read-only">อ่านอย่างเดียว</span>}
        {stats.isUnread && stats.n.isCollecting && <span className="badge badge--collect-only">สายดอง</span>}
      </div>

      <div className="list-row__bars">
        <AggregatedVolumeBar logs={stats.n.readingLogs} type="read" icon={Icons.Book} titleLabel="อ่าน" isMini />
        {stats.n.isCollecting && <AggregatedVolumeBar logs={stats.n.collectionLogs} type="buy" icon={Icons.Cart} titleLabel="สะสม" isMini />}
      </div>

      <div className="list-row__missing">
        {stats.n.isCollecting ? (
          stats.n.collectionLogs.map(log => {
            const missingText = getMissingVolumesText(log.ranges, log.totalVolumes);
            const isComplete = missingText === 'ครบถ้วน';
            return (
              <div key={log.id} style={{ display: 'flex', flexDirection: 'column', marginBottom: '2px' }}>
                <span className="label">{isComplete ? 'สะสมครบ' : 'ขาด'} {log.title ? `(${log.title})` : `(${FORMAT_LABEL[log.format]})`}</span>
                <span className="value" style={{ color: isComplete ? 'var(--read-color)' : '#fca5a5' }}>{missingText}</span>
              </div>
            );
          })
        ) : <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>อ่านอย่างเดียว</span>}
      </div>

      <div className="list-row__actions">
        <button className="btn-icon" title="แก้ไข" onClick={() => setShowEdit(true)}><Icons.Edit /></button>
        <button className="btn-icon btn-icon--danger" title="ลบ" onClick={() => window.confirm(`ลบ "${stats.n.title}"?`) && deleteSeries(stats.n._id)}><Icons.Trash /></button>
      </div>
      {showEdit && <SeriesInfoModal series={stats.n} onClose={() => setShowEdit(false)} />}
    </div>
  );
}

// ==========================================
// 9. Filter Sidebar
// ==========================================
function FilterSection({ title, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="filter-section">
      <button className="filter-section__header" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s', color: 'var(--muted)' }}><Icons.ChevronDown /></span>
      </button>
      {open && <div className="filter-section__body">{children}</div>}
    </div>
  );
}

function FilterChip({ label, active, onClick, icon }) {
  return (
    <button 
      className={`filter-chip ${active ? 'filter-chip--active' : ''}`} 
      onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
    >
      {icon} {label}
    </button>
  );
}

function FilterSidebar({ filter, setFilter, resetFilter, publishers, activeCount }) {
  // ฟังก์ชันช่วยเหลือสำหรับเลือกหลายอัน
  const toggleArr = (key, val) => {
    const arr = filter[key] || [];
    if (arr.includes(val)) setFilter({ [key]: arr.filter(v => v !== val) });
    else setFilter({ [key]: [...arr, val] });
  };

  return (
    <aside className="filter-sidebar">
      <div className="filter-sidebar__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icons.Sliders />
          <span style={{ fontWeight: 700, fontSize: '.875rem' }}>ตัวกรอง</span>
          {activeCount > 0 && <span className="filter-count-badge">{activeCount}</span>}
        </div>
        {activeCount > 0 && (
          <button className="btn btn--sm btn--ghost" style={{ padding: '4px 10px', fontSize: '.75rem' }} onClick={resetFilter}>
            ล้างทั้งหมด
          </button>
        )}
      </div>

      <div className="filter-sidebar__body">
        {/* ค้นหา */}
        <div className="filter-search-wrap">
          <Icons.Search />
          <input
            className="filter-search-input"
            placeholder="ค้นหาชื่อ, ผู้แต่ง, สำนักพิมพ์..."
            value={filter.search || ""}
            onChange={e => setFilter({ search: e.target.value })}
          />
          {filter.search && (
            <button className="filter-search-clear" onClick={() => setFilter({ search: '' })}><Icons.X /></button>
          )}
        </div>

        {/* ประเภท */}
        <FilterSection title="ประเภท">
          <div className="filter-chip-group">
            <FilterChip label="ทั้งหมด" active={filter.type.length === 0} onClick={() => setFilter({ type: [] })} />
            <FilterChip label="Manga" active={filter.type.includes('manga')} onClick={() => toggleArr('type', 'manga')} />
            <FilterChip label="Novel" active={filter.type.includes('novel')} onClick={() => toggleArr('type', 'novel')} />
            <FilterChip label="Light Novel" active={filter.type.includes('light_novel')} onClick={() => toggleArr('type', 'light_novel')} />
          </div>
        </FilterSection>

        {/* สถานะ */}
        <FilterSection title="สถานะการตีพิมพ์">
          <div className="filter-chip-group">
            <FilterChip label="ทั้งหมด" active={filter.status.length === 0} onClick={() => setFilter({ status: [] })} />
            <FilterChip label="ยังไม่จบ" active={filter.status.includes('ongoing')} onClick={() => toggleArr('status', 'ongoing')} />
            <FilterChip label="จบแล้ว" active={filter.status.includes('completed')} onClick={() => toggleArr('status', 'completed')} />
            <FilterChip label="หยุดชั่วคราว" active={filter.status.includes('hiatus')} onClick={() => toggleArr('status', 'hiatus')} />
            <FilterChip label="โดนตัดจบ" active={filter.status.includes('cancelled')} onClick={() => toggleArr('status', 'cancelled')} />
          </div>
        </FilterSection>

        {/* สถานะการอ่าน */}
        <FilterSection title="สถานะการอ่าน">
          <div className="filter-chip-group">
            <FilterChip label="ทั้งหมด" active={filter.readStatus.length === 0} onClick={() => setFilter({ readStatus: [] })} />
            <FilterChip icon={<Icons.CheckCircle />} label="อ่านจบสมบูรณ์" active={filter.readStatus.includes('finished')} onClick={() => toggleArr('readStatus', 'finished')} />
            <FilterChip icon={<Icons.Clock />} label="ทันปัจจุบัน" active={filter.readStatus.includes('caughtup')} onClick={() => toggleArr('readStatus', 'caughtup')} />
            <FilterChip icon={<Icons.BookOpen />} label="กำลังอ่าน" active={filter.readStatus.includes('reading')} onClick={() => toggleArr('readStatus', 'reading')} />
            <FilterChip icon={<Icons.Archive />} label="สายดอง" active={filter.readStatus.includes('unread')} onClick={() => toggleArr('readStatus', 'unread')} />
          </div>
        </FilterSection>

        {/* สถานะการสะสม */}
        <FilterSection title="สถานะการสะสม">
          <div className="filter-chip-group">
            <FilterChip label="ทั้งหมด" active={filter.collectStatus.length === 0} onClick={() => setFilter({ collectStatus: [] })} />
            <FilterChip icon={<Icons.Sparkles />} label="ครบถ้วน" active={filter.collectStatus.includes('complete')} onClick={() => toggleArr('collectStatus', 'complete')} />
            <FilterChip icon={<Icons.Cart />} label="ยังขาดอยู่" active={filter.collectStatus.includes('missing')} onClick={() => toggleArr('collectStatus', 'missing')} />
            <FilterChip icon={<Icons.Ban />} label="ไม่สะสม" active={filter.collectStatus.includes('not_collecting')} onClick={() => toggleArr('collectStatus', 'not_collecting')} />
          </div>
        </FilterSection>

        {/* Rating */}
        <FilterSection title="คะแนนขั้นต่ำ">
          <div className="filter-chip-group">
            <FilterChip label="ทั้งหมด" active={!filter.minRating} onClick={() => setFilter({ minRating: 0 })} />
            {[1, 2, 3, 4, 5].map(r => (
              <FilterChip key={r} label={'★'.repeat(r) + '☆'.repeat(5 - r)} active={filter.minRating === r} onClick={() => setFilter({ minRating: filter.minRating === r ? 0 : r })} />
            ))}
          </div>
        </FilterSection>

        {/* สำนักพิมพ์ */}
        {publishers.length > 0 && (
          <FilterSection title="สำนักพิมพ์">
            <select className="input" style={{ width: '100%' }} value={filter.publisher || ""} onChange={e => setFilter({ publisher: e.target.value })}>
              <option value="">ทุกสำนักพิมพ์</option>
              {publishers.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </FilterSection>
        )}
      </div>
    </aside>
  );
}
// ==========================================
// 9.5 Missing Volumes Checklist Modal (จัดเต็ม + Copy)
// ==========================================
function MissingVolumesModal({ onClose }) {
  const { series } = useSeriesStore();
  
  // 1. ดึงข้อมูลที่ขาดและรายละเอียดที่จำเป็น
  const missingList = useMemo(() => {
    const list = [];
    series.forEach(s => {
      const stats = getSeriesDerivedStats(s);
      if (stats.n.isCollecting && stats.isCollectMissing) {
        const formats = [];
        stats.n.collectionLogs.forEach(log => {
          const missingText = getMissingVolumesText(log.ranges, log.totalVolumes);
          if (missingText !== 'ครบถ้วน' && missingText !== '-') {
            formats.push({ title: log.title || FORMAT_LABEL[log.format], missingText });
          }
        });
        if (formats.length > 0) {
          list.push({ 
            title: s.title, 
            author: s.author,
            publisher: s.publisher,
            typeStr: TYPE_LABEL[s.type] || s.type,
            rawType: s.type,
            formats 
          });
        }
      }
    });
    return list;
  }, [series]);

  // 2. ฟังก์ชันจัดฟอร์แมตข้อความสำหรับปุ่ม Copy
  const handleCopy = () => {
    if (missingList.length === 0) return;
    
    let textToCopy = "📚 เช็กลิสต์หนังสือที่ต้องตามเก็บ\n\n";
    
    missingList.forEach((item, index) => {
      textToCopy += `${index + 1}. ${item.title}\n`;
      
      const details = [];
      if (item.author) details.push(`แต่ง: ${item.author}`);
      if (item.publisher) details.push(`สนพ: ${item.publisher}`);
      if (details.length > 0) {
        textToCopy += `   (${details.join(' | ')})\n`;
      }

      item.formats.forEach(f => {
        textToCopy += `   👉 ขาด (${f.title}): เล่ม ${f.missingText}\n`;
      });
      textToCopy += "\n";
    });

    navigator.clipboard.writeText(textToCopy.trim())
      .then(() => toast.success("คัดลอกข้อความลงคลิปบอร์ดแล้ว!"))
      .catch(() => toast.error("ไม่สามารถคัดลอกได้"));
  };

  return createPortal(
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '600px' }}>
        <div className="modal__header">
          <h2 className="modal__title" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Icons.Receipt /> เช็กลิสต์หนังสือที่ยังขาด
          </h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal__body" style={{ maxHeight: '65vh', overflowY: 'auto', padding: '20px' }}>
          {missingList.length === 0 ? (
             <div className="empty-state">
               <div className="empty-state__icon">🎉</div>
               <h3>สุดยอด!</h3>
               <p>คุณตามเก็บหนังสือครบทุกเรื่องแล้ว ไม่มีอะไรค้าง!</p>
             </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {missingList.map((item, i) => (
                <div key={i} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, color: 'var(--ink)' }}>{i + 1}. {item.title}</h4>
                    <span className={`badge badge--${item.rawType}`}>{item.typeStr}</span>
                  </div>
                  
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {item.author && <span><strong>ผู้แต่ง:</strong> {item.author}</span>}
                    {(item.author && item.publisher) && <span>|</span>}
                    {item.publisher && <span><strong>สนพ:</strong> {item.publisher}</span>}
                  </div>

                  <div style={{ background: 'var(--paper)', borderRadius: '6px', padding: '8px 12px' }}>
                    {item.formats.map((f, j) => (
                      <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '4px 0', borderTop: j > 0 ? '1px dashed var(--border)' : 'none' }}>
                        <span style={{ color: 'var(--muted)' }}>ขาด ({f.title}):</span>
                        <span style={{ color: '#fca5a5', fontWeight: 'bold' }}>เล่ม {f.missingText}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="modal__footer" style={{ justifyContent: missingList.length > 0 ? 'space-between' : 'flex-end' }}>
          {missingList.length > 0 && (
            <button className="btn btn--ghost" onClick={handleCopy} style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}>
              <Icons.Copy /> คัดลอกข้อความ
            </button>
          )}
          <button className="btn btn--primary" onClick={onClose}>ปิดหน้าต่าง</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ==========================================
// 10. Main App
// ==========================================
export default function App() {
  const { series, loading, fetchSeries, fetchStats, stats, filter, setFilter, resetFilter, viewMode, setViewMode } = useSeriesStore();
  
  const [showAdd, setShowAdd] = useState(false);
  const [showMissing, setShowMissing] = useState(false); // ✅ State สำหรับเปิด/ปิด Modal เช็กลิสต์

  useEffect(() => { fetchSeries(); fetchStats(); }, []);

  const publishers = useMemo(() => {
    const list = series.map(s => s.publisher).filter(p => p && p.trim() !== '');
    return [...new Set(list)].sort();
  }, [series]);

const activeFilterCount = useMemo(() => {
    let c = 0;
    if (filter.search) c++;
    if (filter.type.length > 0) c++;
    if (filter.status.length > 0) c++;
    if (filter.publisher) c++;
    if (filter.readStatus.length > 0) c++;
    if (filter.collectStatus.length > 0) c++;
    if (filter.minRating) c++;
    if (filter.maxRating) c++;
    if (filter.yearFrom) c++;
    if (filter.yearTo) c++;
    return c;
  }, [filter]);

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
    
    // เปลี่ยนมาใช้ .includes() เพื่อรองรับการเลือกหลายอัน
    if (filter.type.length > 0) filtered = filtered.filter(s => filter.type.includes(s.type));
    if (filter.status.length > 0) filtered = filtered.filter(s => filter.status.includes(s.status));
    if (filter.publisher) filtered = filtered.filter(s => s.publisher === filter.publisher);
    if (filter.yearFrom) filtered = filtered.filter(s => s.publishYear >= Number(filter.yearFrom));
    if (filter.yearTo) filtered = filtered.filter(s => s.publishYear <= Number(filter.yearTo));

    if (filter.minRating) filtered = filtered.filter(s => (s.rating || 0) >= filter.minRating);
    if (filter.maxRating) filtered = filtered.filter(s => (s.rating || 0) <= filter.maxRating && (s.rating || 0) > 0);

    // แก้ไขการกรองสถานะการอ่านและการสะสม
    filtered = filtered.filter(s => {
      const st = getSeriesDerivedStats(s);
      
      if (filter.readStatus.length > 0) {
        let matchRead = false;
        if (filter.readStatus.includes('finished') && st.isFinishedReading) matchRead = true;
        if (filter.readStatus.includes('caughtup') && st.isCaughtUp) matchRead = true;
        if (filter.readStatus.includes('reading') && st.isReading) matchRead = true;
        if (filter.readStatus.includes('unread') && st.isUnread) matchRead = true;
        if (!matchRead) return false;
      }

      if (filter.collectStatus.length > 0) {
        let matchCollect = false;
        if (filter.collectStatus.includes('complete') && st.isCollectComplete) matchCollect = true;
        if (filter.collectStatus.includes('missing') && st.isCollectMissing) matchCollect = true;
        if (filter.collectStatus.includes('not_collecting') && st.isNotCollecting) matchCollect = true;
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

  return (
    <div className="app-root">
      <Toaster position="bottom-right" />

      {/* ── Top Header ── */}
      <header className="top-header">
        <div className="top-header__brand">
          <h1>本棚</h1>
          <span className="top-header__sub">Manga Tracker</span>
        </div>

        {stats && (
          <div className="top-header__stats">
            <div className="stat-pill"><strong>{stats.totals.totalSeries}</strong><span>เรื่องทั้งหมด</span></div>
            <div className="stat-pill"><strong>{stats.totals.collecting}</strong><span>กำลังสะสม</span></div>
            <div className="stat-pill"><strong>{stats.totals.totalRead}</strong><span>เล่มที่อ่านแล้ว</span></div>
          </div>
        )}

        <div className="top-header__actions">
          <div className="view-toggle">
            <button className={`view-toggle__btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Grid View"><Icons.Grid /></button>
            <button className={`view-toggle__btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="List View"><Icons.List /></button>
          </div>

          <div className="sort-inline">
            <select className="input input--sm" value={filter.sortBy} onChange={e => setFilter({ sortBy: e.target.value })}>
              <option value="updatedAt">อัปเดตล่าสุด</option>
              <option value="title">ชื่อเรื่อง A–Z</option>
              <option value="publishYear">ปีที่พิมพ์</option>
              <option value="rating">คะแนน</option>
              <option value="createdAt">วันที่เพิ่ม</option>
            </select>
            <button
              className="btn-icon sort-dir-btn"
              title={filter.sortOrder === 'DESC' ? 'มากไปน้อย' : 'น้อยไปมาก'}
              onClick={() => setFilter({ sortOrder: filter.sortOrder === 'DESC' ? 'ASC' : 'DESC' })}
            >
              {filter.sortOrder === 'DESC' ? <Icons.SortDesc /> : <Icons.SortAsc />}
            </button>
          </div>

          {/* ✅ ปุ่มกดดูบิลเล่มที่ขาด */}
          <button className="btn btn--ghost" onClick={() => setShowMissing(true)}>
            <Icons.Receipt /> เช็กลิสต์ที่ขาด
          </button>

          <button className="btn btn--primary btn--add" onClick={() => setShowAdd(true)}>
            <Icons.Plus /> เพิ่มเรื่องใหม่
          </button>
        </div>
      </header>

      {/* ── Main Layout: Sidebar + Content ── */}
      <div className="main-layout">
        <FilterSidebar
          filter={filter}
          setFilter={setFilter}
          resetFilter={resetFilter}
          publishers={publishers}
          activeCount={activeFilterCount}
        />

        <main className="main-content">
          <div className="content-meta">
            <span>แสดง <strong>{displaySeries.length}</strong> จากทั้งหมด <strong>{series.length}</strong> เรื่อง</span>
            {activeFilterCount > 0 && (
              <button className="btn btn--sm btn--ghost" onClick={resetFilter} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Icons.X /> ล้างตัวกรอง ({activeFilterCount})
              </button>
            )}
          </div>

          {loading ? (
            <div className="loading"><div className="loading__spinner" /></div>
          ) : (
            <div className={viewMode === 'grid' ? 'card-grid' : 'list-container'}>
              {displaySeries.map(s => (
                viewMode === 'grid'
                  ? <SeriesCard key={s._id} series={s} />
                  : <SeriesListItem key={s._id} series={s} />
              ))}
              {displaySeries.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state__icon">📚</div>
                  <h3>ไม่พบหนังสือที่คุณหา</h3>
                  <p>ลองปรับตัวกรอง หรือล้างการค้นหาดูนะครับ</p>
                  {activeFilterCount > 0 && (
                    <button className="btn btn--ghost" style={{ marginTop: '12px' }} onClick={resetFilter}>ล้างตัวกรองทั้งหมด</button>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {showAdd && <SeriesInfoModal onClose={() => setShowAdd(false)} />}
      
      {/* ✅ เรียกใช้ Modal เช็กลิสต์หนังสือที่ขาด */}
      {showMissing && <MissingVolumesModal onClose={() => setShowMissing(false)} />}
    </div>
  );
}
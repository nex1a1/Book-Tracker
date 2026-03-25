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

const Icons = {
  Book: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>,
  Cart: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>,
  Info: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>,
  Edit: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  Trash: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  Grid: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
  List: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
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

const useSeriesStore = create((set, get) => ({
  series: [], stats: null, total: 0, pages: 1, loading: false, viewMode: 'grid',
  // 🛠️ ขยาย limit เป็น 500 เพื่อให้ดึงข้อมูลมาทำระบบคัดกรองชั้นสูง (Advanced Filter) ได้สมบูรณ์
  filter: { page: 1, limit: 500, sortBy: 'updatedAt', sortOrder: 'DESC', progress: '' },
  setViewMode: (mode) => set({ viewMode: mode }),
  fetchSeries: async () => {
    set({ loading: true });
    try {
      const res = await seriesApi.getAll(get().filter);
      set({ series: res.data.data, total: res.data.pagination.total, pages: res.data.pagination.pages });
    } finally { set({ loading: false }); }
  },
  fetchStats: async () => {
    try {
      const res = await seriesApi.getStats();
      set({ stats: res.data });
    } catch (err) {}
  },
  setFilter: (f) => {
    set((s) => ({ filter: { ...s.filter, page: 1, ...f } }));
    get().fetchSeries();
  },
  deleteSeries: async (id) => {
    await seriesApi.delete(id);
    get().fetchSeries(); get().fetchStats();
  },
}));

// ==========================================
// 3. Helpers, Normalization & Derived Stats
// ==========================================
function getSetFromRanges(ranges) {
  const set = new Set();
  if (ranges && Array.isArray(ranges)) {
    ranges.forEach(([s, e]) => { for (let i = s; i <= e; i++) set.add(i); });
  }
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
  const normalized = { ...series };
  
  if (!normalized.readingLogs) {
    const rLogs = [{ id: 'old-main', title: 'ภาคหลัก', totalVolumes: series.totalVolumes || "", ranges: series.readRanges || [] }];
    if (series.specials && Array.isArray(series.specials)) {
      series.specials.forEach((sp, i) => rLogs.push({ id: `old-sp-${i}`, title: sp.title || 'พิเศษ', totalVolumes: sp.total || "", ranges: sp.read > 0 ? [[1, sp.read]] : [] }));
    }
    normalized.readingLogs = rLogs;
  }
  
  if (!normalized.collectionLogs) {
    normalized.collectionLogs = [{
      id: 'old-col-main',
      format: series.boughtFormat || 'normal',
      title: 'เล่มปกติ',
      totalVolumes: series.thaiLatestVolume || series.totalVolumes || "",
      ranges: series.boughtRanges || []
    }];
  }
  return normalized;
}

// 🛠️ Helper ใหม่! สำหรับคำนวณสถานะความคืบหน้าของมังงะเรื่องนั้นๆ
function getSeriesDerivedStats(series) {
  const n = normalizeSeriesData(series);
  const totalReadJP = n.readingLogs.reduce((sum, log) => sum + (Number(log.totalVolumes) || 0), 0);
  const totalReadCount = n.readingLogs.reduce((sum, log) => sum + getSetFromRanges(log.ranges).size, 0);

  const isAllRead = totalReadCount >= totalReadJP && totalReadJP > 0;
  
  // จัดกลุ่มสถานะการอ่าน
  const isFinishedReading = n.status === 'completed' && isAllRead;
  const isCaughtUp = n.status !== 'completed' && isAllRead;
  const isReading = totalReadCount > 0 && !isAllRead;
  const isUnread = totalReadCount === 0;

  // จัดกลุ่มสถานะการเก็บสะสม
  let isCollectMissing = false;
  let isCollectComplete = false;

  if (n.isCollecting) {
    const hasMissing = n.collectionLogs.some(log => getMissingVolumesText(log.ranges, log.totalVolumes) !== 'ครบถ้วน');
    isCollectMissing = hasMissing;
    isCollectComplete = !hasMissing;
  }

  return { n, totalReadJP, totalReadCount, isAllRead, isFinishedReading, isCaughtUp, isReading, isUnread, isCollectMissing, isCollectComplete };
}


// ==========================================
// 4. Components
// ==========================================

function AggregatedVolumeBar({ logs, type, icon: Icon, titleLabel, isMini = false }) {
  if (!logs || logs.length === 0) return null;
  
  const totalVolumes = logs.reduce((sum, log) => sum + (Number(log.totalVolumes) || 0), 0);
  let count = 0;
  
  const gridCells = [];
  logs.forEach((log, logIndex) => {
    const set = getSetFromRanges(log.ranges);
    count += set.size;
    const volLimit = Number(log.totalVolumes) || 0;
    
    for (let i = 1; i <= volLimit; i++) {
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
          if (type === 'read') {
            if (cell.isFilled) cellClass = cell.isSpecial ? "read special" : "read";
            else cellClass = cell.isSpecial ? "special" : "";
          } else {
            if (cell.isFilled) cellClass = cell.isSpecial ? "bought special" : "bought";
            else cellClass = cell.isSpecial ? "special" : "";
          }
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
        {ranges.length === 0 && <span style={{ fontSize: '.75rem', color: 'var(--muted)' }}>ยังไม่ได้ระบุ{label}</span>}
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

function SeriesInfoModal({ series, onClose }) {
  const isEdit = !!series;
  const normSeries = normalizeSeriesData(series);
  
  const initialState = {
    title: normSeries?.title || "", author: normSeries?.author || "", publisher: normSeries?.publisher || "",
    publishYear: normSeries?.publishYear || "", endYear: normSeries?.endYear || "",
    type: normSeries?.type || "manga", status: normSeries?.status || "ongoing",
    isCollecting: normSeries?.isCollecting ?? true,
    readingLogs: normSeries?.readingLogs || [{ id: Date.now().toString(), title: "ภาคหลัก", totalVolumes: "", ranges: [] }],
    collectionLogs: normSeries?.collectionLogs || [{ id: Date.now().toString(), format: "normal", title: "เล่มปกติ", totalVolumes: "", ranges: [] }]
  };
  const [form, setForm] = useState(initialState);
  const { fetchSeries, fetchStats } = useSeriesStore();

  const addReadLog = () => setForm({ ...form, readingLogs: [...form.readingLogs, { id: Date.now().toString(), title: "", totalVolumes: "", ranges: [] }] });
  const updateReadLog = (idx, field, val) => {
    const newList = [...form.readingLogs]; newList[idx][field] = val;
    setForm({ ...form, readingLogs: newList });
  };
  const removeReadLog = (idx) => setForm({ ...form, readingLogs: form.readingLogs.filter((_, i) => i !== idx) });

  const addCollectLog = () => setForm({ ...form, collectionLogs: [...form.collectionLogs, { id: Date.now().toString(), format: "normal", title: "", totalVolumes: "", ranges: [] }] });
  const updateCollectLog = (idx, field, val) => {
    const newList = [...form.collectionLogs]; newList[idx][field] = val;
    setForm({ ...form, collectionLogs: newList });
  };
  const removeCollectLog = (idx) => setForm({ ...form, collectionLogs: form.collectionLogs.filter((_, i) => i !== idx) });

  const handleStatusChange = (e) => {
    const val = e.target.value;
    if (val === 'ongoing' || val === 'hiatus') { setForm({ ...form, status: val, endYear: "" }); } 
    else { setForm({ ...form, status: val }); }
  };

  const save = async () => {
    if (!form.title || form.title.toString().trim() === "") return toast.error("กรุณากรอกชื่อเรื่อง");
    if (!form.author || form.author.toString().trim() === "") return toast.error("กรุณากรอกผู้แต่ง");
    if (!form.publisher || form.publisher.toString().trim() === "") return toast.error("กรุณากรอกสำนักพิมพ์");
    if (!form.publishYear) return toast.error("กรุณากรอกปีที่พิมพ์");
    if ((form.status === 'completed' || form.status === 'cancelled') && !form.endYear) {
      return toast.error("กรุณากรอกปีที่จบด้วยครับ");
    }

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
      toast.success("บันทึกสำเร็จ"); 
      onClose();
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
            <div className="field"><span>ชื่อเรื่อง <span className="danger">*</span></span><input className="input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
            <div className="field-row">
              <div className="field"><span>ผู้แต่ง <span className="danger">*</span></span><input className="input" value={form.author} onChange={e => setForm({...form, author: e.target.value})} /></div>
              <div className="field"><span>สำนักพิมพ์ <span className="danger">*</span></span><input className="input" value={form.publisher} onChange={e => setForm({...form, publisher: e.target.value})} /></div>
            </div>
            <div className="field-row">
              <div className="field"><span>ปีที่พิมพ์ <span className="danger">*</span></span><input type="number" className="input" value={form.publishYear} onChange={e => setForm({...form, publishYear: e.target.value})} /></div>
              {(form.status === 'completed' || form.status === 'cancelled') && (
                <div className="field"><span>ปีที่จบ <span className="danger">*</span></span><input type="number" className="input" value={form.endYear} onChange={e => setForm({...form, endYear: e.target.value})} /></div>
              )}
            </div>
            <div className="field-row">
              <div className="field"><span>ประเภท</span><select className="input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option value="manga">Manga</option><option value="novel">Novel</option><option value="light_novel">Light Novel</option></select></div>
              <div className="field"><span>สถานะ</span><select className="input" value={form.status} onChange={handleStatusChange}><option value="ongoing">ยังไม่จบ</option><option value="completed">จบแล้ว</option><option value="hiatus">หยุดตีพิมพ์ชั่วคราว</option><option value="cancelled">โดนตัดจบ</option></select></div>
            </div>
          </div>

          <div className="form-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <h3 className="form-section__title" style={{ border: 'none', padding: 0, margin: 0 }}><Icons.Book /> บันทึกการอ่าน (Reading Logs)</h3>
              <button className="btn btn--sm btn--ghost" onClick={addReadLog}>+ เพิ่มชุดการอ่าน</button>
            </div>
            {form.readingLogs.map((log, idx) => (
              <div key={log.id} className="log-editor-box">
                {form.readingLogs.length > 1 && (
                  <button className="btn-icon btn-icon--danger log-editor-box__remove" onClick={() => removeReadLog(idx)}><Icons.Trash /></button>
                )}
                <div className="field-row" style={{ marginBottom: '8px', paddingRight: '30px' }}>
                  <div className="field" style={{ flex: 2 }}><span>ชื่อชุด/ภาค</span><input className="input" value={log.title} onChange={e => updateReadLog(idx, 'title', e.target.value)} placeholder="เช่น ภาคหลัก, ภาคแยก" /></div>
                  <div className="field" style={{ flex: 1 }}><span>ทั้งหมด (เล่ม)</span><input type="number" className="input" value={log.totalVolumes} onChange={e => updateReadLog(idx, 'totalVolumes', e.target.value)} /></div>
                </div>
                <div className="field">
                  <span>ช่วงที่อ่านแล้ว</span>
                  <RangeEditor ranges={log.ranges} onChange={r => updateReadLog(idx, 'ranges', r)} label="ช่วงที่อ่าน" />
                </div>
              </div>
            ))}
          </div>

          <div className="form-section">
            <div className="field" style={{ marginBottom: '8px', padding: '12px', background: 'var(--cream)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <label className="field-checkbox">
                <input type="checkbox" checked={form.isCollecting} onChange={e => setForm({...form, isCollecting: e.target.checked})} />
                <strong>เก็บสะสมเรื่องนี้ (Physical / E-Book)</strong>
              </label>
            </div>
            
            {form.isCollecting && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                  <h3 className="form-section__title" style={{ border: 'none', padding: 0, margin: 0, fontSize: '1rem' }}><Icons.Cart /> รูปแบบที่สะสม (Collection Logs)</h3>
                  <button className="btn btn--sm btn--ghost" onClick={addCollectLog}>+ เพิ่มรูปแบบ</button>
                </div>
                {form.collectionLogs.map((log, idx) => (
                  <div key={log.id} className="log-editor-box log-editor-box--alt">
                    {form.collectionLogs.length > 1 && (
                      <button className="btn-icon btn-icon--danger log-editor-box__remove" onClick={() => removeCollectLog(idx)}><Icons.Trash /></button>
                    )}
                    <div className="field-row" style={{ marginBottom: '8px', paddingRight: '30px' }}>
                      <div className="field" style={{ flex: 1 }}>
                        <span>รูปแบบ</span>
                        <select className="input" value={log.format} onChange={e => updateCollectLog(idx, 'format', e.target.value)}>
                          {Object.entries(FORMAT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                      <div className="field" style={{ flex: 2 }}><span>ชื่อเรียก/หมายเหตุ</span><input className="input" value={log.title} onChange={e => updateCollectLog(idx, 'title', e.target.value)} placeholder="เช่น พิมพ์แรก, Boxset" /></div>
                      <div className="field" style={{ flex: 1 }}><span>ทั้งหมด (เล่ม)</span><input type="number" className="input" value={log.totalVolumes} onChange={e => updateCollectLog(idx, 'totalVolumes', e.target.value)} /></div>
                    </div>
                    <div className="field">
                      <span>ช่วงที่เก็บแล้ว</span>
                      <RangeEditor ranges={log.ranges} onChange={r => updateCollectLog(idx, 'ranges', r)} label="ช่วงที่เก็บ" />
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
        <div className="modal__footer"><button className="btn btn--ghost" onClick={onClose}>ยกเลิก</button><button className="btn btn--save" onClick={save}>บันทึกทั้งหมด</button></div>
      </div>
    </div>, document.body
  );
}

function SeriesListItem({ series }) {
  const [showEdit, setShowEdit] = useState(false);
  const deleteSeries = useSeriesStore(s => s.deleteSeries);
  const stats = getSeriesDerivedStats(series); // ดึงข้อมูลคำนวณสำเร็จรูปมาใช้

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
        {stats.n.isCollecting && (
          <AggregatedVolumeBar logs={stats.n.collectionLogs} type="buy" icon={Icons.Cart} titleLabel="สะสม" isMini />
        )}
      </div>

      <div className="list-row__missing">
        {stats.n.isCollecting ? (
          stats.n.collectionLogs.map(log => {
            const missingText = getMissingVolumesText(log.ranges, log.totalVolumes);
            const isComplete = missingText === 'ครบถ้วน';
            return (
              <div key={log.id} style={{ display: 'flex', flexDirection: 'column', marginBottom: '2px' }}>
                <span className="label">
                  {isComplete ? 'สะสมครบ' : 'ขาด'} {log.title ? `(${log.title})` : `(${FORMAT_LABEL[log.format]})`}
                </span>
                <span className="value" style={{ color: isComplete ? 'var(--read-color)' : '#fca5a5' }}>
                  {missingText}
                </span>
              </div>
            );
          })
        ) : (
          <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>อ่านอย่างเดียว</span>
        )}
      </div>

      <div className="list-row__actions">
        <button className="btn-icon" onClick={() => setShowEdit(true)}><Icons.Edit /></button>
        <button className="btn-icon btn-icon--danger" onClick={() => window.confirm(`ลบ "${stats.n.title}"?`) && deleteSeries(stats.n._id)}><Icons.Trash /></button>
      </div>

      {showEdit && <SeriesInfoModal series={stats.n} onClose={() => setShowEdit(false)} />}
    </div>
  );
}

function SeriesCard({ series }) {
  const [showEdit, setShowEdit] = useState(false);
  const deleteSeries = useSeriesStore(s => s.deleteSeries);
  const stats = getSeriesDerivedStats(series); // ดึงข้อมูลคำนวณสำเร็จรูปมาใช้

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
          <button className="btn-icon" onClick={() => setShowEdit(true)}><Icons.Edit /></button>
          <button className="btn-icon btn-icon--danger" onClick={() => window.confirm(`ลบ "${stats.n.title}"?`) && deleteSeries(stats.n._id)}><Icons.Trash /></button>
        </div>
      </div>
      <div className="card__body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
          <h3 className="card__title" title={stats.n.title}>{stats.n.title}</h3>
          <span className="card__timeline-label">{renderTimeline()}</span>
        </div>
        <p className="card__author">{stats.n.author || "?"} {stats.n.publisher ? `| ${stats.n.publisher}` : ""}</p>
        
        <div className="volume-progress">
          <AggregatedVolumeBar logs={stats.n.readingLogs} type="read" icon={Icons.Book} titleLabel="การอ่าน (JP/Global)" />
          {stats.n.isCollecting && (
            <AggregatedVolumeBar logs={stats.n.collectionLogs} type="buy" icon={Icons.Cart} titleLabel="การสะสม (ไทย)" />
          )}
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
          ) : (
            <p style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Icons.Cart /> <strong>สถานะ:</strong> อ่านอย่างเดียว</p>
          )}
        </div>
      </div>
      {showEdit && <SeriesInfoModal series={stats.n} onClose={() => setShowEdit(false)} />}
    </div>
  );
}

export default function App() {
  const { series, loading, fetchSeries, fetchStats, stats, filter, setFilter, total, viewMode, setViewMode } = useSeriesStore();
  const [showAdd, setShowAdd] = useState(false);
  useEffect(() => { fetchSeries(); fetchStats(); }, []);

  // 🛠️ Logic คัดกรองขั้นสูง (Advanced Filter บน Frontend)
  const displaySeries = useMemo(() => {
    if (!filter.progress) return series;
    return series.filter(s => {
      const derived = getSeriesDerivedStats(s);
      switch(filter.progress) {
        case 'read_finished': return derived.isFinishedReading;
        case 'read_caughtup': return derived.isCaughtUp;
        case 'read_ongoing':  return derived.isReading;
        case 'read_unread':   return derived.isUnread;
        case 'collect_missing':  return derived.isCollectMissing;
        case 'collect_complete': return derived.isCollectComplete;
        default: return true;
      }
    });
  }, [series, filter.progress]);

  return (
    <div className="dashboard">
      <Toaster position="bottom-right" />
      <header className="dashboard__header">
        <div className="header__title"><h1>本棚</h1><span className="header__sub">Manga Tracker</span></div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="view-toggle">
            <button className={`view-toggle__btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}><Icons.Grid /></button>
            <button className={`view-toggle__btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}><Icons.List /></button>
          </div>
          <button className="btn btn--primary btn--add" onClick={() => setShowAdd(true)}><Icons.Plus /> เพิ่มเรื่องใหม่</button>
        </div>
      </header>

      {stats && (
        <div className="stats-bar">
          <div className="stat-card"><strong>{stats.totals.totalSeries}</strong><span>เรื่องทั้งหมด</span></div>
          <div className="stat-card"><strong>{stats.totals.collecting}</strong><span>กำลังสะสม</span></div>
          <div className="stat-card"><strong>{stats.totals.totalRead}</strong><span>เล่มที่อ่านแล้ว</span></div>
        </div>
      )}

      <div className="filter-area">
        <div className="filter-bar" style={{ flexWrap: 'wrap' }}>
          <input className="input filter-search" placeholder="ค้นหาชื่อเรื่อง, ผู้แต่ง, สำนักพิมพ์..." value={filter.search || ""} onChange={e => setFilter({ search: e.target.value })} />
          <select className="input" value={filter.type || ""} onChange={e => setFilter({ type: e.target.value })}><option value="">ทุกประเภท</option><option value="manga">Manga</option><option value="novel">Novel</option><option value="light_novel">Light Novel</option></select>
          <select className="input" value={filter.sortBy} onChange={e => setFilter({ sortBy: e.target.value })}><option value="updatedAt">อัปเดตล่าสุด</option><option value="title">ชื่อเรื่อง</option><option value="publishYear">ปีที่พิมพ์</option></select>
          
          {/* 🛠️ ตัวกรองความคืบหน้าใหม่ */}
          <select className="input" style={{ border: filter.progress ? '1px solid var(--accent)' : '' }} value={filter.progress || ""} onChange={e => setFilter({ progress: e.target.value })}>
            <option value="">ความคืบหน้าทั้งหมด</option>
            <optgroup label="การอ่าน">
              <option value="read_finished">🟢 อ่านจบสมบูรณ์</option>
              <option value="read_caughtup">🟡 ทันปัจจุบัน (รอเล่มใหม่)</option>
              <option value="read_ongoing">📖 กำลังอ่าน (ยังไม่จบ)</option>
              <option value="read_unread">📦 สายดอง (ยังไม่ได้อ่าน)</option>
            </optgroup>
            <optgroup label="การสะสม">
              <option value="collect_missing">🛒 ยังเก็บไม่ครบ (ขาด)</option>
              <option value="collect_complete">✨ สะสมครบถ้วน</option>
            </optgroup>
          </select>
        </div>
      </div>

      {/* บอกจำนวนเมื่อมีการกรองผ่านระบบขั้นสูง */}
      <div className="dashboard__meta">
        <span>แสดง {displaySeries.length} {filter.progress ? '(กรองแล้ว)' : ''} จาก {total} รายการ</span>
      </div>

      {loading ? <div className="loading"><div className="loading__spinner" /></div> : (
        <div className={viewMode === 'grid' ? 'card-grid' : 'list-container'}>
          {displaySeries.map(s => (
            viewMode === 'grid' 
              ? <SeriesCard key={s._id} series={s} />
              : <SeriesListItem key={s._id} series={s} />
          ))}
          {displaySeries.length === 0 && <div style={{ color: 'var(--muted)', marginTop: '20px' }}>ไม่พบรายการที่ตรงกับตัวกรองครับ</div>}
        </div>
      )}
      {showAdd && <SeriesInfoModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { Icons } from "../../../components/Icons";
import { StarRating } from "../../../components/StarRating";
import { useSeriesStore } from "../../../store/useSeriesStore";
import { seriesApi } from "../../../api/seriesApi";
import { normalizeSeriesData, getSeriesDerivedStats } from "../../../utils/helpers";
import { FORMAT_LABEL, RATING_LABEL } from "../../../utils/constants";
import { Series, BookLog, SeriesType, SeriesStatus } from "../../../types";

// Sub-components
import { LiveCardPreview } from "./LiveCardPreview";
import { MalSearchPanel, MalItem } from "./MalSearchPanel";
import { LogEditorBox } from "./LogEditorBox";
import '../Series.css';

interface SeriesInfoModalProps {
  series?: Series;
  onClose: () => void;
}

interface FormState {
  title: string;
  author: string;
  publisher: string;
  publishYear: number | string;
  endYear: number | string;
  type: SeriesType;
  status: SeriesStatus;
  isCollecting: boolean;
  rating: number;
  imageUrl: string;
  notes: string;
  readingLogs: BookLog[];
  collectionLogs: BookLog[];
}

export function SeriesInfoModal({ series, onClose }: SeriesInfoModalProps) {
  const isEdit = !!series;
  const normSeries = normalizeSeriesData(series);
  
  const initialState: FormState = {
    title: normSeries?.title || "", 
    author: normSeries?.author || "", 
    publisher: normSeries?.publisher || "",
    publishYear: normSeries?.publishYear || "", 
    endYear: normSeries?.endYear || "",
    type: normSeries?.type || "manga", 
    status: normSeries?.status || "ongoing",
    isCollecting: normSeries?.isCollecting ?? true,
    rating: normSeries?.rating || 0,
    imageUrl: normSeries?.imageUrl || "", 
    notes: normSeries?.notes || "",
    readingLogs: normSeries?.readingLogs || [{ id: Date.now().toString(), title: "ภาคหลัก", totalVolumes: null, ranges: [] }],
    collectionLogs: normSeries?.collectionLogs || [{ id: Date.now().toString(), format: "normal", title: "เล่มปกติ", totalVolumes: null, ranges: [] }]
  };
  
  const [form, setForm] = useState<FormState>(initialState);
  const { fetchSeries, fetchStats, fetchMetadata, authors, publishers } = useSeriesStore();

  const authorDatalistId = "author-list";
  const publisherDatalistId = "publisher-list";

  // Reactive Stats for Live Preview
  const stats = useMemo(() => {
    try {
      // Create a temporary Series object for the derived stats helper
      const tempSeries: Series = {
        _id: series?._id || "",
        id: series?.id || 0,
        ...form,
        publishYear: form.publishYear ? Number(form.publishYear) : null,
        endYear: form.endYear ? Number(form.endYear) : null,
      };
      return getSeriesDerivedStats(tempSeries);
    } catch (e) {
      const tempSeries: Series = {
        _id: series?._id || "",
        id: series?.id || 0,
        ...form,
        publishYear: form.publishYear ? Number(form.publishYear) : null,
        endYear: form.endYear ? Number(form.endYear) : null,
      };
      return {
        n: tempSeries,
        totalReadJP: 0,
        totalReadCount: 0,
        isAllRead: false,
        isFinishedReading: false,
        isCaughtUp: false,
        isReading: false,
        isUnread: true,
        isCollectMissing: false,
        isCollectComplete: false,
        isNotCollecting: !form.isCollecting
      };
    }
  }, [form, series]);

  const handleSelectMalItem = (m: MalItem) => {
    const node = m.node;
    const coverUrl = node.main_picture?.large || node.main_picture?.medium || "";
    
    // 1. Author mapping
    let authorStr = form.author;
    if (node.authors && node.authors.length > 0) {
      authorStr = node.authors.map(a => {
        const fname = a.node.first_name || "";
        const lname = a.node.last_name || "";
        return `${fname} ${lname}`.trim();
      }).filter(n => n !== "").join(", ");
    }

    // 2. Publish year mapping
    let pYear: number | string = form.publishYear;
    if (node.start_date) pYear = node.start_date.substring(0, 4);
    
    // 3. Status mapping
    let st: SeriesStatus = form.status;
    let eYear: number | string = form.endYear;
    if (node.status === "finished") {
       st = "completed";
       if (node.start_date) eYear = node.start_date.substring(0, 4); // Wait, mal uses end_date sometimes, let's keep it safe. Let's see if MAL API node has end_date. In original code it was end_date, let's look at line 87.
    } else if (node.status === "currently_publishing") st = "ongoing";
    else if (node.status === "on_hiatus") st = "hiatus";
    else if (node.status === "discontinued") st = "cancelled";

    // Wait, let's double check node.status finished and end_date.
    // Line 87 in JS: if (node.end_date) eYear = node.end_date.substring(0, 4);
    // Let's implement that!
    if (node.status === "finished" && (node as any).end_date) {
      eYear = (node as any).end_date.substring(0, 4);
    }

    // 4. Volumes mapping
    const newReadingLogs = [...form.readingLogs];
    const newCollectionLogs = [...form.collectionLogs];
    
    if (node.num_volumes && node.num_volumes > 0) {
      newReadingLogs[0] = { ...newReadingLogs[0], totalVolumes: node.num_volumes };
      newCollectionLogs[0] = { ...newCollectionLogs[0], totalVolumes: node.num_volumes };
    }

    setForm({
      ...form,
      imageUrl: coverUrl,
      author: authorStr || form.author,
      publishYear: pYear || form.publishYear,
      status: st,
      endYear: eYear || form.endYear,
      readingLogs: newReadingLogs,
      collectionLogs: newCollectionLogs
    });
    
    toast.success("ดึงข้อมูลอัตโนมัติเรียบร้อย! (ตรวจสอบและแก้ไขได้เลย)");
  };

  const updateLog = (key: 'readingLogs' | 'collectionLogs', idx: number, field: keyof BookLog, val: any) => {
    const newList = [...form[key]];
    const log = { ...newList[idx] };
    if (key === 'collectionLogs' && field === 'format') {
      const oldFormat = log.format || 'normal';
      const oldFormatLabel = FORMAT_LABEL[oldFormat] || '';
      if (!log.title || log.title.trim() === "" || log.title === oldFormatLabel || log.title === "เล่มปกติ") {
        log.title = FORMAT_LABEL[val as string] || '';
      }
    }
    (log as any)[field] = val;
    newList[idx] = log;
    setForm({ ...form, [key]: newList });
  };
  
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as SeriesStatus;
    if (val === 'ongoing' || val === 'hiatus') {
      setForm({ ...form, status: val, endYear: "" });
    } else {
      setForm({ ...form, status: val });
    }
  };
  
  const save = async () => {
    if (!form.title || form.title.toString().trim() === "") return toast.error("กรุณากรอกชื่อเรื่อง");
    if (!form.author || form.author.toString().trim() === "") return toast.error("กรุณากรอกผู้แต่ง");
    if (!form.publisher || form.publisher.toString().trim() === "") return toast.error("กรุณากรอกสำนักพิมพ์");
    if (!form.publishYear) return toast.error("กรุณากรอกปีที่พิมพ์");
    if ((form.status === 'completed' || form.status === 'cancelled') && !form.endYear) return toast.error("กรุณากรอกปีที่จบด้วยครับ");
    try {
      const payload: Partial<Series> = {
        ...form,
        publishYear: form.publishYear ? Number(form.publishYear) : null,
        endYear: form.endYear ? Number(form.endYear) : null,
        readingLogs: form.readingLogs.map(l => ({ ...l, totalVolumes: l.totalVolumes ? Number(l.totalVolumes) : null })),
        collectionLogs: form.collectionLogs.map(l => ({ ...l, totalVolumes: l.totalVolumes ? Number(l.totalVolumes) : null }))
      };
      if (isEdit && series) {
        await seriesApi.update(series._id, payload);
      } else {
        await seriesApi.create(payload);
      }
      await Promise.all([fetchSeries(), fetchStats(), fetchMetadata()]);
      toast.success("บันทึกสำเร็จ"); 
      onClose();
    } catch { 
      toast.error("เกิดข้อผิดพลาดในการบันทึก"); 
    }
  };

  return createPortal(
    <div className="modal-overlay">
      <div className={`modal modal--large ${isEdit ? "modal--edit" : "modal--add"}`}>
        <div className="modal__header">
          <h2 className="modal__title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isEdit ? <Icons.Edit /> : <Icons.Plus />} 
            {isEdit ? `แก้ไขข้อมูลเรื่อง: ${series?.title}` : "เพิ่มเรื่องใหม่เข้าระบบ"}
          </h2>
          <button type="button" className="modal__close" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal__grid-container">
          
          {/* ── Left Sidebar: Live Preview & MAL Suggestions ── */}
          <div className="modal__sidebar">
            <LiveCardPreview form={form} stats={stats} />

            <MalSearchPanel 
              title={form.title} 
              imageUrl={form.imageUrl} 
              onSelectMalItem={handleSelectMalItem} 
            />

            {/* Sidebar Notes area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <span className="sidebar-mal-title">บันทึกช่วยจำ / ข้อมูลเพิ่มเติม</span>
              <textarea 
                className="textarea" 
                value={form.notes} 
                onChange={e => setForm({ ...form, notes: e.target.value })} 
                placeholder="คำวิจารณ์ย่อๆ, ชั้นที่เก็บหนังสือ, หรือบันทึกความทรงจำอื่นๆ..."
                style={{ flex: 1, minHeight: '100px' }}
              />
            </div>
          </div>
          
          {/* ── Right Content Form Area ── */}
          <div className="modal__form-content">
            
            {/* Card 1: ข้อมูลพื้นฐาน */}
            <div className="form-section-card">
              <h3 className="form-section-card__title"><Icons.Info /> ข้อมูลพื้นฐานของเรื่อง</h3>
              
              <div className="field">
                <span>ชื่อเรื่องภาษาไทย / ชื่อเรื่องหลัก <span className="danger">*</span></span>
                <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="กรอกชื่อเรื่องภาษาไทย..." />
              </div>

              <div className="field">
                <span>ลิงก์รูปภาพหน้าปกหนังสือ (URL)</span>
                <input className="input" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} placeholder="วาง URL ลิงก์รูปปกตรงนี้ หรือคลิกดึงปกจาก MAL ในแถบด้านซ้าย..." />
              </div>

              <div className="field-row">
                <div className="field">
                  <span>ผู้แต่ง / ผู้แต่งเรื่อง <span className="danger">*</span></span>
                  <input className="input" value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} list={authorDatalistId} placeholder="พิมพ์ชื่อผู้แต่ง..." />
                  <datalist id={authorDatalistId}>
                    {authors.map(a => <option key={a.id} value={a.name} />)}
                  </datalist>
                </div>
                <div className="field">
                  <span>สำนักพิมพ์แปลไทย <span className="danger">*</span></span>
                  <input className="input" value={form.publisher} onChange={e => setForm({ ...form, publisher: e.target.value })} list={publisherDatalistId} placeholder="พิมพ์ชื่อสำนักพิมพ์..." />
                  <datalist id={publisherDatalistId}>
                    {publishers.map(p => <option key={p.id} value={p.name} />)}
                  </datalist>
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <span>ประเภทสื่อ</span>
                  <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as SeriesType })}>
                    <option value="manga">Manga (การ์ตูน)</option>
                    <option value="novel">Novel (นิยาย)</option>
                    <option value="light_novel">Light Novel (ไลท์โนเวล)</option>
                  </select>
                </div>
                <div className="field">
                  <span>สถานะความคืบหน้าเรื่อง</span>
                  <select className="input" value={form.status} onChange={handleStatusChange}>
                    <option value="ongoing">ยังไม่จบ (Ongoing)</option>
                    <option value="completed">จบแล้ว (Completed)</option>
                    <option value="hiatus">หยุดตีพิมพ์ชั่วคราว (On Hiatus)</option>
                    <option value="cancelled">โดนตัดจบ (Cancelled)</option>
                  </select>
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <span>ปีที่พิมพ์ครั้งแรก (ค.ศ.) <span className="danger">*</span></span>
                  <input type="number" className="input" value={form.publishYear} onChange={e => setForm({ ...form, publishYear: e.target.value })} placeholder="เช่น 2019" />
                </div>
                {(form.status === 'completed' || form.status === 'cancelled') && (
                  <div className="field">
                    <span>ปีที่พิมพ์เสร็จสิ้น (ค.ศ.) <span className="danger">*</span></span>
                    <input type="number" className="input" value={form.endYear} onChange={e => setForm({ ...form, endYear: e.target.value })} placeholder="เช่น 2024" />
                  </div>
                )}
              </div>

              <div className="field">
                <span>คะแนนความชื่นชอบส่วนตัว</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
                  <StarRating rating={form.rating} onRate={(r) => setForm({ ...form, rating: r })} size="lg" />
                  {form.rating > 0 && <span style={{ fontSize: '.8rem', color: 'var(--accent)', fontWeight: 'bold' }}>{RATING_LABEL[form.rating]}</span>}
                </div>
              </div>
            </div>

            {/* Card 2: บันทึกการอ่าน */}
            <div className="form-section-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <h3 className="form-section-card__title" style={{ border: 'none', padding: 0, margin: 0 }}><Icons.Book /> บันทึกความคืบหน้าการอ่าน</h3>
                <button 
                  type="button"
                  className="btn btn--sm btn--ghost" 
                  style={{ borderColor: 'rgba(255,123,0,0.4)', color: 'var(--accent)' }} 
                  onClick={() => setForm({ ...form, readingLogs: [...form.readingLogs, { id: Date.now().toString(), title: "", totalVolumes: null, ranges: [] }] })}
                >
                  + เพิ่มชุด/ภาคใหม่
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {form.readingLogs.map((log, idx) => (
                  <LogEditorBox
                    key={log.id}
                    log={log}
                    idx={idx}
                    type="reading"
                    showRemove={form.readingLogs.length > 1}
                    onRemove={() => setForm({ ...form, readingLogs: form.readingLogs.filter((_, i) => i !== idx) })}
                    onUpdate={(field, val) => updateLog('readingLogs', idx, field, val)}
                  />
                ))}
              </div>
            </div>

            {/* Card 3: ข้อมูลการสะสม */}
            <div className="form-section-card">
              <div className="modal-checkbox-wrapper" onClick={() => setForm({ ...form, isCollecting: !form.isCollecting })}>
                <input type="checkbox" checked={form.isCollecting} readOnly style={{ cursor: 'pointer' }} />
                <strong style={{ fontSize: '0.88rem', color: 'var(--ink)' }}>เปิดเก็บสะสมคอลเลกชันสำหรับเรื่องนี้ (ตามเล่มแปลไทย)</strong>
              </div>
              
              {form.isCollecting && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                    <h3 className="form-section-card__title" style={{ border: 'none', padding: 0, margin: 0, fontSize: '0.88rem' }}><Icons.Cart /> รูปแบบรูปเล่มสะสม (Physical / E-Book)</h3>
                    <button 
                      type="button"
                      className="btn btn--sm btn--ghost" 
                      style={{ borderColor: 'rgba(255,123,0,0.4)', color: 'var(--accent)' }} 
                      onClick={() => setForm({ ...form, collectionLogs: [...form.collectionLogs, { id: Date.now().toString(), format: "normal", title: "", totalVolumes: null, ranges: [] }] })}
                    >
                      + เพิ่มรูปแบบสะสม
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {form.collectionLogs.map((log, idx) => (
                      <LogEditorBox
                        key={log.id}
                        log={log}
                        idx={idx}
                        type="collection"
                        showRemove={form.collectionLogs.length > 1}
                        onRemove={() => setForm({ ...form, collectionLogs: form.collectionLogs.filter((_, i) => i !== idx) })}
                        onUpdate={(field, val) => updateLog('collectionLogs', idx, field, val)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
        
        <div className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose}>ยกเลิก</button>
          <button type="button" className="btn btn--save" style={{ background: 'var(--accent)', color: '#111' }} onClick={save}>บันทึกข้อมูลซีรีส์ทั้งหมด</button>
        </div>
      </div>
    </div>, document.body
  );
}

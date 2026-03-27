import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import './Modals.css';
import { Icons } from "./Icons";
import { StarRating, RangeEditor } from "./SharedUI";
import { useSeriesStore, seriesApi } from "../store";
import { normalizeSeriesData, getSeriesDerivedStats, getMissingVolumesText, FORMAT_LABEL, TYPE_LABEL, RATING_LABEL } from "../utils";

export function SeriesInfoModal({ series, onClose }) {
  const isEdit = !!series;
  const normSeries = normalizeSeriesData(series);
  
  // ✅ 1. เพิ่ม imageUrl เข้าไปใน State เริ่มต้น
  const initialState = {
    title: normSeries?.title || "", author: normSeries?.author || "", publisher: normSeries?.publisher || "",
    publishYear: normSeries?.publishYear || "", endYear: normSeries?.endYear || "",
    type: normSeries?.type || "manga", status: normSeries?.status || "ongoing",
    isCollecting: normSeries?.isCollecting ?? true,
    rating: normSeries?.rating || 0,
    imageUrl: normSeries?.imageUrl || "", 
    readingLogs: normSeries?.readingLogs || [{ id: Date.now().toString(), title: "ภาคหลัก", totalVolumes: "", ranges: [] }],
    collectionLogs: normSeries?.collectionLogs || [{ id: Date.now().toString(), format: "normal", title: "เล่มปกติ", totalVolumes: "", ranges: [] }]
  };
  
  const [form, setForm] = useState(initialState);
  
  // ✅ 2. สร้าง State สำหรับเก็บผลลัพธ์จาก MAL และสถานะตอนกำลังโหลด
  const [malResults, setMalResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const { fetchSeries, fetchStats } = useSeriesStore();

  // ✅ 3. ฟังก์ชันสำหรับยิง API ไปหา Backend ของเรา ให้ไปคุยกับ MAL ต่อ
  const searchMAL = async () => {
    if (!form.title || form.title.trim() === "") return toast.error("กรุณากรอกชื่อเรื่องก่อนค้นหา");
    
    setIsSearching(true);
    try {
      // เรียกใช้ API Route ที่เราเพิ่งสร้างใน Backend
      const res = await fetch(`/api/mal/search?q=${encodeURIComponent(form.title)}`);
      const data = await res.json();
      
      if (data.data && data.data.length > 0) {
        setMalResults(data.data);
        toast.success(`พบ ${data.data.length} เรื่อง! คลิกที่รูปเพื่อเลือกปกได้เลย`);
      } else {
        toast.error("ไม่พบข้อมูลเรื่องนี้ในระบบ MAL");
        setMalResults([]);
      }
    } catch (err) {
      toast.error("เกิดข้อผิดพลาดในการดึงข้อมูล");
    } finally {
      setIsSearching(false);
    }
  };

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
            
            {/* ✅ 4. เพิ่มปุ่มค้นหาปกไว้ข้างๆ ช่องชื่อเรื่อง */}
            <div className="field">
              <span>ชื่อเรื่อง <span className="danger">*</span></span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                <button 
                  className="btn btn--primary" 
                  onClick={searchMAL} 
                  disabled={isSearching} 
                  style={{ flexShrink: 0 }}
                >
                  {isSearching ? "กำลังหา..." : "🔍 ค้นหาปกใน MAL"}
                </button>
              </div>
            </div>

            {/* ✅ 5. พื้นที่แสดงผลลัพธ์จาก MAL ให้ผู้ใช้คลิกเลือกรูป */}
            {malResults.length > 0 && (
              <div style={{ background: 'var(--paper)', padding: '12px', borderRadius: 'var(--radius)', border: '1px dashed var(--border)', display: 'flex', gap: '12px', overflowX: 'auto', marginBottom: '8px' }}>
                {malResults.map(m => {
                  const coverUrl = m.node.main_picture?.large || m.node.main_picture?.medium || "";
                  const isSelected = form.imageUrl === coverUrl;
                  return (
                    <div 
                      key={m.node.id} 
                      onClick={() => setForm({ ...form, imageUrl: coverUrl })}
                      style={{ 
                        cursor: 'pointer', 
                        border: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
                        borderRadius: '4px', padding: '2px', minWidth: '80px', textAlign: 'center',
                        transition: 'all 0.2s', opacity: isSelected ? 1 : 0.6
                      }}
                    >
                      <img src={m.node.main_picture?.medium} alt="" style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '2px' }} />
                      <div style={{ fontSize: '0.65rem', color: isSelected ? 'var(--accent)' : 'var(--muted)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '76px' }} title={m.node.title}>
                        {m.node.title}
                      </div>
                    </div>
                  );
                })}
                <button className="btn-icon" onClick={() => setMalResults([])} style={{ alignSelf: 'center', marginLeft: 'auto' }} title="ปิดหน้าต่างนี้"><Icons.X /></button>
              </div>
            )}

            {/* ✅ 6. ช่องใส่ลิงก์รูป (เผื่ออยากแปะรูปไทยเอง) */}
            <div className="field">
              <span>ลิงก์รูปหน้าปก (เลือกจาก MAL หรือแปะลิงก์เอง)</span>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="preview" style={{ width: '40px', height: '60px', objectFit: 'cover', borderRadius: 'var(--radius)', border: '1px solid var(--border)', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '40px', height: '60px', background: 'var(--cream)', borderRadius: 'var(--radius)', border: '1px dashed var(--border)', flexShrink: 0 }} />
                )}
                <input className="input" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
              </div>
            </div>

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

export function MissingVolumesModal({ onClose }) {
  const { series } = useSeriesStore();
  
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
          list.push({ title: s.title, author: s.author, publisher: s.publisher, typeStr: TYPE_LABEL[s.type] || s.type, rawType: s.type, formats });
        }
      }
    });
    return list;
  }, [series]);

  const handleCopy = () => {
    if (missingList.length === 0) return;
    let textToCopy = "📚 เช็กลิสต์หนังสือที่ต้องตามเก็บ\n\n";
    missingList.forEach((item, index) => {
      textToCopy += `${index + 1}. ${item.title}\n`;
      const details = [];
      if (item.author) details.push(`แต่ง: ${item.author}`);
      if (item.publisher) details.push(`สนพ: ${item.publisher}`);
      if (details.length > 0) textToCopy += `   (${details.join(' | ')})\n`;
      item.formats.forEach(f => { textToCopy += `   👉 ขาด (${f.title}): เล่ม ${f.missingText}\n`; });
      textToCopy += "\n";
    });
    navigator.clipboard.writeText(textToCopy.trim()).then(() => toast.success("คัดลอกข้อความลงคลิปบอร์ดแล้ว!")).catch(() => toast.error("ไม่สามารถคัดลอกได้"));
  };

  return createPortal(
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '600px' }}>
        <div className="modal__header">
          <h2 className="modal__title" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><Icons.Receipt /> เช็กลิสต์หนังสือที่ยังขาด</h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="modal__body" style={{ maxHeight: '65vh', overflowY: 'auto', padding: '16px' }}>
          {missingList.length === 0 ? (
             <div className="empty-state"><div className="empty-state__icon">🎉</div><h3>สุดยอด!</h3><p>คุณตามเก็บหนังสือครบทุกเรื่องแล้ว ไม่มีอะไรค้าง!</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {missingList.map((item, i) => (
                <div key={i} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
                  {/* Row 1: ลำดับ + ชื่อ + badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '0.875rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {i + 1}. {item.title}
                    </span>
                    <span className={`badge badge--${item.rawType}`}>{item.typeStr}</span>
                  </div>
                  {/* Row 2: meta + missing volumes inline */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginTop: '5px' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                      {item.author && <span>{item.author}</span>}
                      {item.author && item.publisher && <span style={{ opacity: 0.4 }}>·</span>}
                      {item.publisher && <span>{item.publisher}</span>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 }}>
                      {item.formats.map((f, j) => (
                        <div key={j} style={{ fontSize: '0.78rem', display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{ color: 'var(--muted)' }}>{f.title}:</span>
                          <span style={{ color: 'var(--special-color)', fontWeight: 700 }}>เล่ม {f.missingText}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal__footer" style={{ justifyContent: missingList.length > 0 ? 'space-between' : 'flex-end' }}>
          {missingList.length > 0 && <button className="btn btn--ghost" onClick={handleCopy} style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}><Icons.Copy /> คัดลอกข้อความ</button>}
          <button className="btn btn--primary" onClick={onClose}>ปิดหน้าต่าง</button>
        </div>
      </div>
    </div>, document.body
  );
}
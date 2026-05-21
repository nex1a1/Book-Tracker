import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { Icons } from "../../components/Icons";
import './Modals.css';
import { StarRating, RangeEditor } from "../../components/SharedUI";
import { useSeriesStore } from "../../store/useSeriesStore";
import { seriesApi } from "../../api/seriesApi";
import { normalizeSeriesData, getSeriesDerivedStats, getMissingVolumesText, getSetFromRanges, FORMAT_LABEL, TYPE_LABEL, RATING_LABEL } from "../../utils";

export function SeriesInfoModal({ series, onClose }) {
  const isEdit = !!series;
  const normSeries = normalizeSeriesData(series);
  
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
  const [malResults, setMalResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const { fetchSeries, fetchStats, authors, publishers } = useSeriesStore();

  const authorDatalistId = "author-list";
  const publisherDatalistId = "publisher-list";

  const searchMAL = async () => {
    if (!form.title || form.title.trim() === "") return toast.error("กรุณากรอกชื่อเรื่องก่อนค้นหา");
    setIsSearching(true);
    try {
      const res = await fetch(`/api/mal/search?q=${encodeURIComponent(form.title)}`);
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        setMalResults(data.data);
        toast.success(`พบ ${data.data.length} เรื่อง! คลิกที่รูปเพื่อดึงข้อมูลเลย`);
      } else {
        toast.error("ไม่พบข้อมูลเรื่องนี้ในระบบ MAL");
        setMalResults([]);
      }
    } catch (err) { toast.error("เกิดข้อผิดพลาดในการดึงข้อมูล"); } 
    finally { setIsSearching(false); }
  };

  const handleSelectMalItem = (m) => {
    const node = m.node;
    const coverUrl = node.main_picture?.large || node.main_picture?.medium || "";
    
    // 1. จัดการชื่อผู้แต่ง (กันกรณีที่ MAL ส่งมาแค่ชื่อ หรือแค่นามสกุล)
    let authorStr = form.author;
    if (node.authors && node.authors.length > 0) {
      authorStr = node.authors.map(a => {
        const fname = a.node.first_name || "";
        const lname = a.node.last_name || "";
        return `${fname} ${lname}`.trim();
      }).filter(n => n !== "").join(", ");
    }

    // 2. จัดการปีที่พิมพ์
    let pYear = form.publishYear;
    if (node.start_date) pYear = node.start_date.substring(0, 4);
    
    // 3. จัดการสถานะและปีที่จบ
    let st = form.status;
    let eYear = form.endYear;
    if (node.status === "finished") {
       st = "completed";
       if (node.end_date) eYear = node.end_date.substring(0, 4);
    } else if (node.status === "currently_publishing") st = "ongoing";
    else if (node.status === "on_hiatus") st = "hiatus";
    else if (node.status === "discontinued") st = "cancelled";

    // 4. จัดการจำนวนเล่ม (อัปเดตให้ทั้งฝั่งอ่านและฝั่งสะสมพร้อมกัน!)
    const newReadingLogs = [...form.readingLogs];
    const newCollectionLogs = [...form.collectionLogs];
    
    // 💡 ระบบจะเติมเลขให้ก็ต่อเมื่อ MAL มีข้อมูล (คือเฉพาะเรื่องที่จบแล้วเท่านั้น)
    if (node.num_volumes && node.num_volumes > 0) {
      newReadingLogs[0] = { ...newReadingLogs[0], totalVolumes: node.num_volumes.toString() };
      newCollectionLogs[0] = { ...newCollectionLogs[0], totalVolumes: node.num_volumes.toString() };
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

  const updateLog = (key, idx, field, val) => {
    const newList = [...form[key]];
    const log = newList[idx];
    if (key === 'collectionLogs' && field === 'format') {
      const oldFormat = log.format || 'normal';
      const oldFormatLabel = FORMAT_LABEL[oldFormat] || '';
      if (!log.title || log.title.trim() === "" || log.title === oldFormatLabel || log.title === "เล่มปกติ") {
        log.title = FORMAT_LABEL[val] || '';
      }
    }
    log[field] = val;
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
      await Promise.all([fetchSeries(), fetchStats(), fetchMetadata()]);
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
            
            <div className="field">
              <span>ชื่อเรื่อง <span className="danger">*</span></span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                <button className="btn btn--primary" onClick={searchMAL} disabled={isSearching} style={{ flexShrink: 0 }}>
                  {isSearching ? "กำลังหา..." : "🔍 ค้นหาปกใน MAL"}
                </button>
              </div>
            </div>

            {malResults.length > 0 && (
              <div style={{ background: 'var(--paper)', padding: '12px', borderRadius: 'var(--radius)', border: '1px dashed var(--border)', display: 'flex', gap: '12px', overflowX: 'auto', marginBottom: '8px' }}>
                {malResults.map(m => {
                  const coverUrl = m.node.main_picture?.large || m.node.main_picture?.medium || "";
                  const isSelected = form.imageUrl === coverUrl;
                  return (
                    // 🔴 เปลี่ยนมาเรียกใช้ฟังก์ชัน handleSelectMalItem ตรงนี้
                    <div 
                      key={m.node.id} 
                      onClick={() => handleSelectMalItem(m)}
                      style={{ cursor: 'pointer', border: isSelected ? '2px solid var(--accent)' : '2px solid transparent', borderRadius: '4px', padding: '2px', minWidth: '80px', textAlign: 'center', transition: 'all 0.2s', opacity: isSelected ? 1 : 0.6 }}
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
              <div className="field">
                <span>ผู้แต่ง <span className="danger">*</span></span>
                <input className="input" value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} list={authorDatalistId} />
                <datalist id={authorDatalistId}>
                  {authors.map(a => <option key={a.id} value={a.name} />)}
                </datalist>
              </div>
              <div className="field">
                <span>สำนักพิมพ์ <span className="danger">*</span></span>
                <input className="input" value={form.publisher} onChange={e => setForm({ ...form, publisher: e.target.value })} list={publisherDatalistId} />
                <datalist id={publisherDatalistId}>
                  {publishers.map(p => <option key={p.id} value={p.name} />)}
                </datalist>
              </div>
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPublisher, setSelectedPublisher] = useState("all");
  const [viewMode, setViewMode] = useState("grouped"); // "grouped" | "list"
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [collapsedPubs, setCollapsedPubs] = useState(new Set());
  const [editingSeries, setEditingSeries] = useState(null);

  // 1. Gather all series that have missing volumes
  const missingList = useMemo(() => {
    const list = [];
    series.forEach(s => {
      const stats = getSeriesDerivedStats(s);
      if (stats.n.isCollecting && stats.isCollectMissing) {
        const formats = [];
        stats.n.collectionLogs.forEach(log => {
          const missingText = getMissingVolumesText(log.ranges, log.totalVolumes);
          if (missingText !== 'ครบถ้วน' && missingText !== '-') {
            const boughtCount = getSetFromRanges(log.ranges).size;
            const limit = Number(log.totalVolumes) || 0;
            const count = Math.max(0, limit - boughtCount);

            formats.push({ 
              id: log.id,
              format: log.format,
              title: log.title || FORMAT_LABEL[log.format], 
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
    const pubs = new Set();
    missingList.forEach(item => {
      if (item.publisher) pubs.add(item.publisher);
    });
    return Array.from(pubs).sort();
  }, [missingList]);

  // 4. Grouped missing items for Publisher view
  const groupedByPublisher = useMemo(() => {
    const groups = {};
    filteredList.forEach(item => {
      const pub = item.publisher || "ไม่ระบุสำนักพิมพ์";
      if (!groups[pub]) groups[pub] = [];
      groups[pub].push(item);
    });
    return groups;
  }, [filteredList]);

  // 5. Active dynamic statistics
  const stats = useMemo(() => {
    let totalSeries = filteredList.length;
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

  const toggleCheckItem = (key) => {
    const next = new Set(checkedItems);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setCheckedItems(next);
  };

  const toggleCollapsePub = (pub) => {
    const next = new Set(collapsedPubs);
    if (next.has(pub)) next.delete(pub);
    else next.add(pub);
    setCollapsedPubs(next);
  };

  // Copy items to clipboard (excluding checked ones)
  const handleCopy = () => {
    const itemsToCopy = filteredList.map(item => {
      const remainingFormats = item.formats.filter(f => !checkedItems.has(`${item._id}-${f.id}`));
      if (remainingFormats.length === 0) return null;
      return { ...item, formats: remainingFormats };
    }).filter(Boolean);

    if (itemsToCopy.length === 0) {
      return toast.error("ไม่มีรายการที่ยังไม่เช็กเหลืออยู่ให้คัดลอก");
    }

    let textToCopy = "📚 เช็กลิสต์หนังสือที่ต้องตามเก็บ\n\n";
    itemsToCopy.forEach((item, index) => {
      textToCopy += `${index + 1}. ${item.title}\n`;
      const details = [];
      if (item.author) details.push(`แต่ง: ${item.author}`);
      if (item.publisher) details.push(`สนพ: ${item.publisher}`);
      if (details.length > 0) textToCopy += `   (${details.join(' | ')})\n`;
      item.formats.forEach(f => { textToCopy += `   👉 ขาด (${f.title}): เล่ม ${f.missingText}\n`; });
      textToCopy += "\n";
    });
    
    navigator.clipboard.writeText(textToCopy.trim())
      .then(() => toast.success("คัดลอกรายการที่เหลือลงคลิปบอร์ดแล้ว!"))
      .catch(() => toast.error("ไม่สามารถคัดลอกได้"));
  };

  const handleCopySingle = (item) => {
    let textToCopy = `📚 ${item.title}\n`;
    const details = [];
    if (item.author) details.push(`แต่ง: ${item.author}`);
    if (item.publisher) details.push(`สนพ: ${item.publisher}`);
    if (details.length > 0) textToCopy += `(${details.join(' | ')})\n`;
    item.formats.forEach(f => { textToCopy += `👉 ขาด (${f.title}): เล่ม ${f.missingText}\n`; });
    
    navigator.clipboard.writeText(textToCopy.trim())
      .then(() => toast.success(`คัดลอก "${item.title}" แล้ว!`))
      .catch(() => toast.error("ไม่สามารถคัดลอกได้"));
  };

  // Rendering a row
  const renderItemRow = (item) => {
    return item.formats.map((f) => {
      const itemKey = `${item._id}-${f.id}`;
      const isChecked = checkedItems.has(itemKey);

      return (
        <div key={itemKey} className={`checklist-item-row ${isChecked ? "is-checked" : ""}`}>
          <div className="checklist-item-checkbox-wrapper">
            <div 
              className="checklist-custom-checkbox" 
              onClick={() => toggleCheckItem(itemKey)}
              title={isChecked ? "ยกเลิกการเลือก" : "ทำเครื่องหมายว่าหยิบแล้ว"}
            >
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 4L4 7L9 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          <div className="checklist-item-title-col">
            <h4 className="checklist-item-title" title={item.title}>{item.title}</h4>
            <span className={`badge checklist-item-badge badge--${item.rawType}`}>{item.typeStr}</span>
          </div>

          <div className="checklist-item-author-col" title={item.author || "ไม่ระบุ"}>
            {item.author || <span className="checklist-empty-field">-</span>}
          </div>

          <div className="checklist-item-publisher-col" title={item.publisher}>
            {item.publisher && item.publisher !== "ไม่ระบุสำนักพิมพ์" ? (
              item.publisher
            ) : (
              <span className="checklist-empty-field">-</span>
            )}
          </div>

          <div className="checklist-item-missing-col">
            {f.title && f.title !== "เล่มปกติ" && (
              <span className="checklist-item-format">{f.title}</span>
            )}
            <span className="checklist-item-missing-volumes">เล่ม {f.missingText}</span>
          </div>

          <div className="checklist-item-actions">
            <button 
              className="checklist-row-btn checklist-row-btn--edit" 
              onClick={() => setEditingSeries(item.rawSeries)}
              title="แก้ไขรายละเอียดเรื่องนี้"
            >
              <Icons.Edit />
            </button>
            <button 
              className="checklist-row-btn checklist-row-btn--copy" 
              onClick={() => handleCopySingle(item)}
              title="คัดลอกข้อมูลเรื่องนี้"
            >
              <Icons.Copy />
            </button>
          </div>
        </div>
      );
    });
  };

  return createPortal(
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '1200px', width: '95vw', height: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal__header">
          <h2 className="modal__title" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><Icons.Receipt /> เช็กลิสต์หนังสือที่ยังขาด</h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="modal__body" style={{ padding: '16px 20px', gap: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}>
          
          {/* Header Controls Bar */}
          <div className="checklist-header-bar">
            {/* Stats Pill */}
            <div className="checklist-stats-bar">
              <div className="checklist-stats-bar__pills">
                <span className="checklist-stats-pill">
                  ขาดทั้งหมด {stats.totalSeries} เรื่อง ({stats.totalVolumes} เล่ม)
                </span>
                {stats.checkedVolumes > 0 && (
                  <span className="checklist-stats-pill checklist-stats-pill--muted">
                    หยิบแล้ว {stats.checkedVolumes} เล่ม ({stats.checkedItemsCount} รายการ)
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                * ติ๊กถูกวงกลมด้านซ้ายเพื่อตัดรายการออกชั่วคราวขณะเลือกซื้อ
              </span>
            </div>

            {/* Filter controls */}
            <div className="checklist-controls">
              {/* Search Box */}
              <div className="checklist-search-wrapper">
                <span className="checklist-search-icon"><Icons.Search /></span>
                <input 
                  type="text" 
                  className="input checklist-search-input" 
                  placeholder="ค้นหาชื่อเรื่อง / ผู้แต่ง / สนพ..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Publisher Selector */}
              <select 
                className="checklist-select-filter"
                value={selectedPublisher}
                onChange={(e) => setSelectedPublisher(e.target.value)}
              >
                <option value="all">ทุกสำนักพิมพ์</option>
                {publisherOptions.map((pub, i) => (
                  <option key={i} value={pub}>{pub}</option>
                ))}
              </select>

              {/* View Toggle */}
              <div className="checklist-view-toggle">
                <button 
                  className={`checklist-view-btn ${viewMode === 'grouped' ? 'active' : ''}`}
                  onClick={() => setViewMode('grouped')}
                  title="แยกกลุ่มตามสำนักพิมพ์"
                >
                  <Icons.Filter /> แยก สนพ.
                </button>
                <button 
                  className={`checklist-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="แสดงรายการยาวทั้งหมด"
                >
                  <Icons.List /> รายการยาว
                </button>
              </div>
            </div>
          </div>

          {/* Checklist Main Body */}
          <div className="checklist-body">
            {filteredList.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <div className="empty-state__icon">
                  {missingList.length === 0 ? "🎉" : "🔍"}
                </div>
                <h3>{missingList.length === 0 ? "ครบถ้วนสมบูรณ์!" : "ไม่พบผลลัพธ์"}</h3>
                <p>
                  {missingList.length === 0 
                    ? "คุณสะสมครบทุกเล่มทุกเรื่องแล้วครับ สุดยอดเลย!" 
                    : "ไม่พบรายการหนังสือขาดที่ตรงกับเงื่อนไขการค้นหา/ตัวกรอง"}
                </p>
              </div>
            ) : (
              <>
                {/* Table Grid Headers */}
                <div className="checklist-table-header">
                  <div className="checklist-header-col"></div>
                  <div className="checklist-header-col">ชื่อเรื่อง</div>
                  <div className="checklist-header-col">ผู้แต่ง</div>
                  <div className="checklist-header-col">สำนักพิมพ์</div>
                  <div className="checklist-header-col" style={{ textAlign: 'right', paddingRight: '8px' }}>เล่มที่ขาด</div>
                  <div className="checklist-header-col" style={{ textAlign: 'center' }}>จัดการ</div>
                </div>

                {viewMode === 'grouped' ? (
                  // Grouped view
                  Object.entries(groupedByPublisher).map(([pub, items]) => {
                    const isCollapsed = collapsedPubs.has(pub);
                    
                    // Count remaining active volumes in this group
                    const groupTotalVolumes = items.reduce((sum, item) => 
                      sum + item.formats.reduce((s, f) => s + f.missingCount, 0), 0
                    );
                    
                    return (
                      <div key={pub} className="checklist-publisher-group">
                        <div 
                          className="checklist-publisher-header"
                          onClick={() => toggleCollapsePub(pub)}
                        >
                          <div className="checklist-publisher-title">
                            <span style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.15s', fontSize: '0.7rem' }}>
                              ▼
                            </span>
                            {pub}
                          </div>
                          <span className="checklist-publisher-count">
                            {items.length} เรื่อง ({groupTotalVolumes} เล่ม)
                          </span>
                        </div>

                        {!isCollapsed && (
                          <div className="checklist-publisher-content">
                            {items.map(item => renderItemRow(item))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  // Flat List view
                  <div className="checklist-publisher-group" style={{ background: 'transparent', border: '1px solid var(--border)' }}>
                    <div className="checklist-publisher-content">
                      {filteredList.map(item => renderItemRow(item))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="modal__footer" style={{ justifyContent: 'space-between', padding: '12px 20px' }}>
          {filteredList.length > 0 ? (
            <button 
              className="btn btn--ghost" 
              onClick={handleCopy} 
              style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}
            >
              <Icons.Copy /> คัดลอกข้อความ ({stats.totalVolumes - stats.checkedVolumes} เล่มที่เหลือ)
            </button>
          ) : <div />}
          <button className="btn btn--primary" onClick={onClose}>ปิดเช็กลิสต์</button>
        </div>
      </div>

      {/* Overlay Series Info Modal for Quick Editing */}
      {editingSeries && (
        <SeriesInfoModal 
          series={editingSeries} 
          onClose={() => setEditingSeries(null)} 
        />
      )}
    </div>, document.body
  );
}
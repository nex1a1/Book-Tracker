import React from "react";
import { Icons } from "../../../components/Icons";
import { RangeEditor } from "../../../components/RangeEditor";
import { FORMAT_LABEL } from "../../../utils/constants";

export function LogEditorBox({ log, idx, type, showRemove, onRemove, onUpdate }) {
  const isReading = type === "reading";

  return (
    <div 
      className={`log-editor-box ${!isReading ? "log-editor-box--alt" : ""}`} 
      style={{ borderRadius: '6px', background: isReading ? 'var(--paper)' : undefined }}
    >
      {showRemove && (
        <button 
          className="btn-icon btn-icon--danger log-editor-box__remove" 
          onClick={onRemove} 
          title={isReading ? "ลบชุดการอ่านนี้" : "ลบรูปแบบสะสมนี้"}
        >
          <Icons.Trash />
        </button>
      )}

      {isReading ? (
        // Reading Log Editor Fields
        <>
          <div className="field-row" style={{ marginBottom: '8px', paddingRight: showRemove ? '32px' : '0' }}>
            <div className="field" style={{ flex: 3 }}>
              <span>ชื่อชุด / ภาคเรื่อง (อ่านเล่มญี่ปุ่น/เล่มแปล)</span>
              <input 
                className="input" 
                value={log.title || ""} 
                onChange={e => onUpdate('title', e.target.value)} 
                placeholder="เช่น ภาคหลัก, ภาคต้น, ภาคสมทบ..." 
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <span>ทั้งหมด (เล่ม)</span>
              <input 
                type="number" 
                className="input" 
                value={log.totalVolumes || ""} 
                onChange={e => onUpdate('totalVolumes', e.target.value)} 
                placeholder="ระบุเล่มรวม" 
              />
            </div>
          </div>
          <div className="field">
            <span>ช่วงเล่มที่อ่านเสร็จแล้ว</span>
            <RangeEditor ranges={log.ranges || []} onChange={ranges => onUpdate('ranges', ranges)} />
          </div>
        </>
      ) : (
        // Collection Log Editor Fields
        <>
          <div className="field-row" style={{ marginBottom: '8px', paddingRight: showRemove ? '32px' : '0' }}>
            <div className="field" style={{ flex: 1.5 }}>
              <span>รูปแบบจัดเก็บ</span>
              <select 
                className="input" 
                value={log.format || "normal"} 
                onChange={e => onUpdate('format', e.target.value)}
              >
                {Object.entries(FORMAT_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ flex: 2 }}>
              <span>ชื่อเรียกคอลเลกชัน / หมายเหตุย่อ</span>
              <input 
                className="input" 
                value={log.title || ""} 
                onChange={e => onUpdate('title', e.target.value)} 
                placeholder="เช่น เล่มปกติ, ฉบับพิเศษ..." 
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <span>มีทั้งหมด (เล่ม)</span>
              <input 
                type="number" 
                className="input" 
                value={log.totalVolumes || ""} 
                onChange={e => onUpdate('totalVolumes', e.target.value)} 
                placeholder="เช่น 23" 
              />
            </div>
          </div>
          <div className="field">
            <span>ช่วงเล่มที่มีอยู่ในครอบครอง (สะสมแล้ว)</span>
            <RangeEditor ranges={log.ranges || []} onChange={ranges => onUpdate('ranges', ranges)} />
          </div>
        </>
      )}
    </div>
  );
}

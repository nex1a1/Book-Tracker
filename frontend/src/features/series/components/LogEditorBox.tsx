import React from "react";
import { Icons } from "../../../components/Icons";
import { RangeEditor } from "../../../components/RangeEditor";
import { Dropdown } from "../../../components/Dropdown";
import { FORMAT_LABEL } from "../../../utils/constants";
import { BookLog } from "../../../types";

const FORMAT_OPTIONS = Object.entries(FORMAT_LABEL).map(([value, label]) => ({ value, label }));

interface LogEditorBoxProps {
  log: BookLog;
  idx: number;
  type: "reading" | "collection";
  showRemove: boolean;
  onRemove: () => void;
  onUpdate: (field: keyof BookLog, value: BookLog[keyof BookLog]) => void;
}

export function LogEditorBox({ log, idx, type, showRemove, onRemove, onUpdate }: LogEditorBoxProps) {
  const isReading = type === "reading";

  return (
    <div 
      className={`log-editor-box ${!isReading ? "log-editor-box--alt" : ""}`} 
      style={{ borderRadius: '6px', background: isReading ? 'var(--paper)' : undefined }}
    >
      {showRemove && (
        <button 
          type="button"
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
            <label className="field" style={{ flex: 3 }}>
              <span>ชื่อชุด / ภาคเรื่อง (อ่านเล่มญี่ปุ่น/เล่มแปล)</span>
              <input
                className="input"
                value={log.title || ""}
                onChange={e => onUpdate('title', e.target.value)}
                placeholder="เช่น ภาคหลัก, ภาคต้น, ภาคสมทบ..."
              />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>ทั้งหมด (เล่ม)</span>
              <input
                type="number"
                className="input"
                value={log.totalVolumes || ""}
                onChange={e => {
                  const val = e.target.value;
                  onUpdate('totalVolumes', val === "" ? null : Number(val));
                }}
                placeholder="ระบุเล่มรวม"
              />
            </label>
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
            <label className="field" style={{ flex: 1.5 }}>
              <span>รูปแบบจัดเก็บ</span>
              <Dropdown
                value={log.format || "normal"}
                options={FORMAT_OPTIONS}
                onChange={val => onUpdate('format', val)}
              />
            </label>
            <label className="field" style={{ flex: 2 }}>
              <span>ชื่อเรียกคอลเลกชัน / หมายเหตุย่อ</span>
              <input
                className="input"
                value={log.title || ""}
                onChange={e => onUpdate('title', e.target.value)}
                placeholder="เช่น เล่มปกติ, ฉบับพิเศษ..."
              />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>มีทั้งหมด (เล่ม)</span>
              <input
                type="number"
                className="input"
                value={log.totalVolumes || ""}
                onChange={e => {
                  const val = e.target.value;
                  onUpdate('totalVolumes', val === "" ? null : Number(val));
                }}
                placeholder="เช่น 23"
              />
            </label>
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

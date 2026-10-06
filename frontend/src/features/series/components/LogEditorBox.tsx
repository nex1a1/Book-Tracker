import React from "react";
import { Icons } from "../../../components/Icons";
import { RangeEditor } from "../../../components/RangeEditor";
import { Dropdown } from "../../../components/Dropdown";
import { FORMAT_LABEL, LANGUAGE_LABEL } from "../../../utils/constants";
import { BookLog } from "../../../types";

const FORMAT_OPTIONS = Object.entries(FORMAT_LABEL).map(([value, label]) => ({ value, label }));
const LANGUAGE_OPTIONS = Object.entries(LANGUAGE_LABEL).map(([value, label]) => ({ value, label }));

// The server only stores whole volume counts from 1 up; anything else (blank, 0, "-3", "2.5") means "unknown".
function parseTotalVolumes(raw: string): number | null {
  const n = Number(raw);
  return raw !== "" && Number.isInteger(n) && n > 0 ? n : null;
}

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
                min={1}
                step={1}
                onChange={e => onUpdate('totalVolumes', parseTotalVolumes(e.target.value))}
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
            {!log.isPartial && (
              <label className="field" style={{ flex: 1 }}>
                <span>มีทั้งหมด (เล่ม)</span>
                <input
                  type="number"
                  className="input"
                  value={log.totalVolumes || ""}
                  min={1}
                  step={1}
                  onChange={e => onUpdate('totalVolumes', parseTotalVolumes(e.target.value))}
                  placeholder="เช่น 23"
                />
              </label>
            )}
          </div>
          <div className="field-row" style={{ marginBottom: '8px', alignItems: 'flex-end' }}>
            <label className="field" style={{ flex: 1.5 }}>
              <span>ภาษา</span>
              <Dropdown
                value={log.language || "th"}
                options={LANGUAGE_OPTIONS}
                onChange={val => onUpdate('language', val as BookLog['language'])}
              />
            </label>
            <label className="field-checkbox" style={{ flex: 3, paddingBottom: '8px' }}>
              <input
                type="checkbox"
                checked={Boolean(log.isPartial)}
                onChange={e => onUpdate('isPartial', e.target.checked)}
              />
              เก็บเฉพาะบางเล่ม/บางปก (ไม่นับเป็นเล่มที่ขาด)
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

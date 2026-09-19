import React, { useState } from "react";
import toast from "react-hot-toast";
import { mergeRanges } from "../utils/helpers";
import { VolumeRange } from "../types";
import './RangeEditor.css';

interface RangeEditorProps {
  ranges?: VolumeRange[];
  onChange: (ranges: VolumeRange[]) => void;
  label?: string;
}

export function RangeEditor({ ranges = [], onChange, label = "ช่วงเล่ม" }: RangeEditorProps) {
  const [s, setS] = useState("");
  const [e, setE] = useState("");

  const add = () => {
    const startVal = s ? s.toString().trim() : "";
    const endVal = e ? e.toString().trim() : "";
    if (startVal || endVal) {
      const start = startVal ? Number(startVal) : Number(endVal);
      const end = endVal ? Number(endVal) : Number(startVal);
      if (start > end) { 
        toast.error("เล่มเริ่มต้นต้องน้อยกว่าเล่มจบ"); 
        return; 
      }
      // ✅ Merge instantly on add
      const merged = mergeRanges([...ranges, [start, end]]);
      onChange(merged); 
      setS(""); 
      setE("");
    }
  };

  return (
    <div className="range-editor">
      <div className="range-list">
        {ranges.map((r, i) => {
          const rangeText = r[0] === r[1] ? `${r[0]}` : `${r[0]}-${r[1]}`;
          return (
            <span key={i} className="range-tag">
              <span className="badge badge--novel">{rangeText}</span>
              <button
                type="button"
                className="btn-icon btn-icon--danger"
                onClick={() => onChange(ranges.filter((_, idx) => idx !== i))}
                aria-label={`ลบช่วงเล่ม ${rangeText}`}
              >
                ✕
              </button>
            </span>
          );
        })}
      </div>
      <div className="range-inputs field-row" style={{ marginTop: '6px' }}>
        <input
          className="input input--num"
          type="number"
          value={s}
          onChange={x => setS(x.target.value)}
          placeholder="เริ่ม"
          aria-label={`${label} เริ่ม`}
        />
        <span className="range-row__sep">–</span>
        <input
          className="input input--num"
          type="number"
          value={e}
          onChange={x => setE(x.target.value)}
          placeholder="จบ"
          aria-label={`${label} จบ`}
        />
        <button type="button" className="btn btn--sm btn--ghost" onClick={add}>เพิ่ม</button>
      </div>
    </div>
  );
}

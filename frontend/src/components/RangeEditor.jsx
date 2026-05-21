import React, { useState } from "react";
import toast from "react-hot-toast";
import { Icons } from "./Icons";
import { mergeRanges } from "../utils/helpers";
import './RangeEditor.css';

export function RangeEditor({ ranges = [], onChange, label = "ช่วงเล่ม" }) {
  const [s, setS] = useState(""), [e, setE] = useState("");
  const add = () => {
    if (s && e) {
      const start = Number(s), end = Number(e);
      if (start > end) { toast.error("เล่มเริ่มต้นต้องน้อยกว่าเล่มจบ"); return; }
      // ✅ Merge instantly on add
      const merged = mergeRanges([...ranges, [start, end]]);
      onChange(merged); 
      setS(""); setE("");
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

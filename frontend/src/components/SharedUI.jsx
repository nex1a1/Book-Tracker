import React, { useState } from "react";
import toast from "react-hot-toast";
import { Icons } from "./Icons";
import { getSetFromRanges } from "../utils";
import './SharedUI.css';
export function StarRating({ rating = 0, onRate, size = 'sm', readOnly = false }) {
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

export function AggregatedVolumeBar({ logs, type, icon: Icon, titleLabel, isMini = false }) {
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

export function RangeEditor({ ranges, onChange, label = "ช่วงเล่ม" }) {
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
import React from "react";
import { Icons } from "../../../components/Icons";
import { getSetFromRanges } from "../../../utils/helpers";

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

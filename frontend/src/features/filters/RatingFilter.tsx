import React, { useState, useEffect } from "react";
import { Icons } from "../../components/Icons";

export interface RatingFilterProps {
  minRating: number;
  maxRating: number;
  unratedOnly?: boolean;
  onChange: (patch: { minRating: number; maxRating: number; unratedOnly: boolean }) => void;
}

export type RatingMode = "atLeast" | "exact" | "range";

export function getRatingBadgeText(minRating: number, maxRating: number, unratedOnly?: boolean): string | null {
  if (unratedOnly) return "ยังไม่ให้คะแนน";
  if (minRating > 0 && maxRating > 0 && minRating === maxRating) {
    return `★ ${minRating.toFixed(1)} พอดี`;
  }
  if (minRating > 0 && (!maxRating || maxRating === 5)) {
    return `★ ${minRating.toFixed(1)}+`;
  }
  if (minRating > 0 || (maxRating > 0 && maxRating < 5)) {
    return `★ ${(minRating || 0).toFixed(1)} – ${(maxRating || 5).toFixed(1)}`;
  }
  return null;
}

export function RatingFilter({ minRating, maxRating, unratedOnly, onChange }: RatingFilterProps) {
  // Infer initial mode from props
  const inferMode = (): RatingMode => {
    if (minRating > 0 && maxRating > 0 && minRating === maxRating) return "exact";
    if (minRating > 0 && maxRating > 0 && maxRating < 5 && minRating !== maxRating) return "range";
    return "atLeast";
  };

  const [mode, setMode] = useState<RatingMode>(inferMode());
  const [hoverRating, setHoverRating] = useState<number>(0);

  // Sync mode if props change externally
  useEffect(() => {
    if (minRating > 0 && maxRating > 0 && minRating === maxRating) {
      setMode("exact");
    } else if (minRating > 0 && maxRating > 0 && maxRating < 5 && minRating !== maxRating) {
      setMode("range");
    }
  }, [minRating, maxRating]);

  const currentMin = minRating || 0;
  const currentMax = maxRating || 5;

  const handleStarClick = (e: React.MouseEvent<HTMLButtonElement>, n: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const isHalf = e.clientX - rect.left < rect.width / 2;
    const val = isHalf ? n - 0.5 : n;

    if (mode === "exact") {
      if (minRating === val && maxRating === val && !unratedOnly) {
        onChange({ minRating: 0, maxRating: 0, unratedOnly: false });
      } else {
        onChange({ minRating: val, maxRating: val, unratedOnly: false });
      }
    } else if (mode === "atLeast") {
      if (minRating === val && (!maxRating || maxRating === 5) && !unratedOnly) {
        onChange({ minRating: 0, maxRating: 0, unratedOnly: false });
      } else {
        onChange({ minRating: val, maxRating: 0, unratedOnly: false });
      }
    } else {
      // range mode
      onChange({ minRating: val, maxRating: Math.max(val, currentMax), unratedOnly: false });
    }
  };

  const handleStarMouseMove = (e: React.MouseEvent<HTMLButtonElement>, n: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const isHalf = e.clientX - rect.left < rect.width / 2;
    setHoverRating(isHalf ? n - 0.5 : n);
  };

  const switchMode = (newMode: RatingMode) => {
    setMode(newMode);
    if (newMode === "exact") {
      const target = currentMin > 0 ? currentMin : 4.0;
      onChange({ minRating: target, maxRating: target, unratedOnly: false });
    } else if (newMode === "atLeast") {
      const target = currentMin > 0 ? currentMin : 3.0;
      onChange({ minRating: target, maxRating: 0, unratedOnly: false });
    } else {
      // range
      const min = currentMin > 0 ? currentMin : 2.0;
      const max = currentMax > 0 && currentMax !== min ? currentMax : 5.0;
      onChange({ minRating: min, maxRating: max, unratedOnly: false });
    }
  };

  const handleSingleSliderChange = (val: number) => {
    if (mode === "exact") {
      onChange({ minRating: val, maxRating: val, unratedOnly: false });
    } else if (mode === "atLeast") {
      onChange({ minRating: val, maxRating: 0, unratedOnly: false });
    }
  };

  const handleMinSlider = (val: number) => {
    let nextMax = currentMax;
    if (val > nextMax) {
      nextMax = val;
    }
    onChange({ minRating: val, maxRating: nextMax === 5 ? 0 : nextMax, unratedOnly: false });
  };

  const handleMaxSlider = (val: number) => {
    let nextMin = currentMin;
    if (val < nextMin) {
      nextMin = val;
    }
    onChange({ minRating: nextMin, maxRating: val === 5 ? 0 : val, unratedOnly: false });
  };

  const toggleUnrated = () => {
    if (unratedOnly) {
      onChange({ minRating: 0, maxRating: 0, unratedOnly: false });
    } else {
      onChange({ minRating: 0, maxRating: 0, unratedOnly: true });
    }
  };

  // Status label in top right
  const getStatusText = () => {
    if (hoverRating > 0) {
      return hoverRating === 5 ? "5.0 ดาวเต็ม" : `${hoverRating.toFixed(1)} ดาว`;
    }
    if (unratedOnly) return "ยังไม่ให้คะแนน";
    if (mode === "exact") {
      return currentMin > 0 ? `${currentMin.toFixed(1)} ดาวพอดี` : "ทั้งหมด (0 - 5★)";
    }
    if (mode === "atLeast") {
      if (currentMin === 0) return "ทั้งหมด (0 - 5★)";
      return `${currentMin.toFixed(1)}+ ดาวขึ้นไป`;
    }
    // range
    if (currentMin === 0 && currentMax === 5) return "ทั้งหมด (0 - 5★)";
    return `${currentMin.toFixed(1)} ★ — ${currentMax.toFixed(1)} ★`;
  };

  const activeStarVal = hoverRating || (unratedOnly ? 0 : currentMin);

  // Range track fill calculations
  let fillLeft = 0;
  let fillWidth = 100;
  if (mode === "exact") {
    const val = currentMin || 0;
    fillLeft = Math.max(0, (val / 5) * 100 - 4);
    fillWidth = 8;
  } else if (mode === "atLeast") {
    const val = currentMin || 0;
    fillLeft = (val / 5) * 100;
    fillWidth = 100 - fillLeft;
  } else {
    fillLeft = (currentMin / 5) * 100;
    fillWidth = Math.max(0, ((currentMax - currentMin) / 5) * 100);
  }

  return (
    <div className="rating-filter">
      {/* Mode Switcher: ≥ ขั้นต่ำ vs = พอดี vs ⇄ ช่วง */}
      <div className="rating-filter__mode-tabs">
        <button
          type="button"
          className={`rating-filter__mode-tab ${mode === "atLeast" ? "rating-filter__mode-tab--active" : ""}`}
          onClick={() => switchMode("atLeast")}
        >
          ≥ ขั้นต่ำ
        </button>
        <button
          type="button"
          className={`rating-filter__mode-tab ${mode === "exact" ? "rating-filter__mode-tab--active" : ""}`}
          onClick={() => switchMode("exact")}
        >
          = พอดี
        </button>
        <button
          type="button"
          className={`rating-filter__mode-tab ${mode === "range" ? "rating-filter__mode-tab--active" : ""}`}
          onClick={() => switchMode("range")}
        >
          ⇄ ช่วง
        </button>
      </div>

      {/* Top Row: Quick Star Picker & Live Status */}
      <div className="rating-filter__header-row">
        <div className="rating-filter__star-icons" onMouseLeave={() => setHoverRating(0)}>
          {[1, 2, 3, 4, 5].map((n) => {
            const isFilled = n <= activeStarVal;
            const isHalf = !isFilled && activeStarVal === n - 0.5;
            return (
              <button
                key={n}
                type="button"
                className={`rating-filter__star-btn ${isFilled || isHalf ? "filled" : ""}`}
                onMouseMove={(e) => handleStarMouseMove(e, n)}
                onClick={(e) => handleStarClick(e, n)}
                aria-label={`เลือกดาว ${n}`}
                title={mode === "exact" ? `${n} ดาวพอดี` : `${n} ดาวขึ้นไป`}
              >
                <Icons.Star filled={isFilled} half={isHalf} />
              </button>
            );
          })}
        </div>
        <span className="rating-filter__status-text">{getStatusText()}</span>
      </div>

      {/* Slider Area */}
      <div className="rating-filter__slider-wrap">
        <div className="rating-filter__slider-track">
          <div
            className="rating-filter__slider-fill"
            style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
          />
          {mode === "range" ? (
            <>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={currentMin}
                onChange={(e) => handleMinSlider(parseFloat(e.target.value))}
                aria-label="คะแนนอย่างน้อย"
                className="rating-filter__range-input"
              />
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={currentMax}
                onChange={(e) => handleMaxSlider(parseFloat(e.target.value))}
                aria-label="คะแนนไม่เกิน"
                className="rating-filter__range-input"
              />
            </>
          ) : (
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={currentMin}
              onChange={(e) => handleSingleSliderChange(parseFloat(e.target.value))}
              aria-label={mode === "exact" ? "คะแนนพอดี" : "คะแนนขั้นต่ำ"}
              className="rating-filter__range-input rating-filter__range-input--single"
            />
          )}
        </div>
        <div className="rating-filter__slider-ticks">
          <span>0.0</span>
          <span>1.0</span>
          <span>2.0</span>
          <span>3.0</span>
          <span>4.0</span>
          <span>5.0</span>
        </div>
      </div>

      {/* Bottom Row: Unrated Chip */}
      <div className="rating-filter__footer-row">
        <button
          type="button"
          className={`rating-filter__unrated-chip ${unratedOnly ? "rating-filter__unrated-chip--active" : ""}`}
          onClick={toggleUnrated}
        >
          <span className="rating-filter__unrated-icon">☆☆☆☆☆</span>
          <span>ยังไม่ให้คะแนน</span>
        </button>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { Icons } from "../../components/Icons";

export interface RatingFilterProps {
  minRating: number;
  unratedOnly?: boolean;
  onChange: (patch: { minRating: number; unratedOnly: boolean }) => void;
}

export function getRatingBadgeText(minRating: number, unratedOnly?: boolean): string | null {
  if (unratedOnly) return "ยังไม่ให้คะแนน";
  return minRating > 0 ? `★ ${minRating.toFixed(1)}+` : null;
}

/** Minimum rating (half stars: the left half of a star picks n - 0.5), or unrated series only. */
export function RatingFilter({ minRating, unratedOnly, onChange }: RatingFilterProps) {
  const [hoverRating, setHoverRating] = useState<number>(0);

  const starValue = (e: React.MouseEvent<HTMLButtonElement>, n: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return e.clientX - rect.left < rect.width / 2 ? n - 0.5 : n;
  };

  const handleStarClick = (e: React.MouseEvent<HTMLButtonElement>, n: number) => {
    const val = starValue(e, n);
    onChange({ minRating: minRating === val && !unratedOnly ? 0 : val, unratedOnly: false });
  };

  const getStatusText = () => {
    if (hoverRating > 0) return hoverRating === 5 ? "5.0 ดาวเต็ม" : `${hoverRating.toFixed(1)} ดาวขึ้นไป`;
    if (unratedOnly) return "ยังไม่ให้คะแนน";
    return minRating > 0 ? `${minRating.toFixed(1)}+ ดาวขึ้นไป` : "ทั้งหมด";
  };

  const activeStarVal = hoverRating || (unratedOnly ? 0 : minRating);

  return (
    <div className="rating-filter">
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
                onMouseMove={(e) => setHoverRating(starValue(e, n))}
                onClick={(e) => handleStarClick(e, n)}
                aria-label={`เลือกดาว ${n}`}
                title={`${n} ดาวขึ้นไป`}
              >
                <Icons.Star filled={isFilled} half={isHalf} />
              </button>
            );
          })}
        </div>
        <span className="rating-filter__status-text">{getStatusText()}</span>
      </div>

      <div className="rating-filter__footer-row">
        <button
          type="button"
          className={`rating-filter__unrated-chip ${unratedOnly ? "rating-filter__unrated-chip--active" : ""}`}
          onClick={() => onChange({ minRating: 0, unratedOnly: !unratedOnly })}
        >
          <span className="rating-filter__unrated-icon">☆☆☆☆☆</span>
          <span>ยังไม่ให้คะแนน</span>
        </button>
      </div>
    </div>
  );
}

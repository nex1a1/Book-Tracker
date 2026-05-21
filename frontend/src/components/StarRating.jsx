import React, { useState } from "react";
import { Icons } from "./Icons";
import './StarRating.css';

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

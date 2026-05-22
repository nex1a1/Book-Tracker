import React from "react";
import { SeriesCard } from "./SeriesCard";

export function SeriesGridView({ displaySeries, activeFilterCount, onResetFilter }) {
  return (
    <div className="card-grid">
      {displaySeries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📚</div>
          <h3>ไม่พบหนังสือที่คุณหา</h3>
          <p>ลองปรับตัวกรอง หรือล้างการค้นหาดูนะครับ</p>
          {activeFilterCount > 0 && (
            <button className="btn btn--ghost" style={{ marginTop: '12px' }} onClick={onResetFilter}>
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>
      ) : (
        displaySeries.map(s => (
          <SeriesCard key={s._id} series={s} />
        ))
      )}
    </div>
  );
}

import React from "react";
import { SeriesCard } from "./SeriesCard";
import { Series } from "../../../types";

interface SeriesGridViewProps {
  displaySeries: Series[];
  activeFilterCount: number;
  onResetFilter: () => void;
}

export function SeriesGridView({ displaySeries, activeFilterCount, onResetFilter }: SeriesGridViewProps) {
  return (
    <div className="card-grid">
      {displaySeries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">{activeFilterCount > 0 ? "🔍" : "📚"}</div>
          <h3>{activeFilterCount > 0 ? "ไม่พบผลลัพธ์ที่ตรงกัน" : "ยังไม่มีเรื่องในคอลเลกชัน"}</h3>
          <p>
            {activeFilterCount > 0
              ? "ลองปรับตัวกรอง หรือล้างการค้นหาดูนะครับ"
              : "เริ่มต้นด้วยการเพิ่มเรื่องแรกของคุณเข้าระบบ"}
          </p>
          {activeFilterCount > 0 && (
            <button
              type="button"
              className="btn btn--ghost"
              style={{ marginTop: '12px' }}
              onClick={onResetFilter}
            >
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

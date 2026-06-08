import React from "react";
import { SeriesListItem } from "./SeriesListItem";
import { Series } from "../../../types";

interface SeriesListViewProps {
  displaySeries: Series[];
  activeFilterCount: number;
  onResetFilter: () => void;
}

export function SeriesListView({ displaySeries, activeFilterCount, onResetFilter }: SeriesListViewProps) {
  return (
    <div className="list-container">
      {displaySeries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📚</div>
          <h3>ไม่พบหนังสือที่คุณหา</h3>
          <p>ลองปรับตัวกรอง หรือล้างการค้นหาดูนะครับ</p>
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
        <>
          <div className="list-table-header">
            <div className="list-header-col">ปก</div>
            <div className="list-header-col">ชื่อเรื่อง & ผู้เขียน</div>
            <div className="list-header-col">ประเภท & สถานะ</div>
            <div className="list-header-col">ความคืบหน้า</div>
            <div className="list-header-col">การสะสม / เล่มขาด</div>
            <div className="list-header-col list-header-col--center">คะแนน</div>
            <div className="list-header-col list-header-col--right">จัดการ</div>
          </div>
          {displaySeries.map(s => (
            <SeriesListItem key={s._id} series={s} />
          ))}
        </>
      )}
    </div>
  );
}

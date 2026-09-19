import React from "react";
import { SeriesListItem } from "./SeriesListItem";
import { Series } from "../../../types";

interface SeriesListViewProps {
  displaySeries: Series[];
  activeFilterCount: number;
  onResetFilter: () => void;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
  onSortChange: (sortBy: string, sortOrder: 'ASC' | 'DESC') => void;
}

interface SortableColProps {
  label: string;
  sortKey: string;
  defaultOrder: 'ASC' | 'DESC';
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
  onSortChange: (sortBy: string, sortOrder: 'ASC' | 'DESC') => void;
  className?: string;
}

function SortableCol({ label, sortKey, defaultOrder, sortBy, sortOrder, onSortChange, className }: SortableColProps) {
  const isActive = sortBy === sortKey;
  return (
    <button
      type="button"
      className={`list-header-col list-header-col--sortable ${isActive ? 'list-header-col--active' : ''} ${className || ''}`}
      onClick={() => onSortChange(sortKey, isActive ? (sortOrder === 'ASC' ? 'DESC' : 'ASC') : defaultOrder)}
      aria-pressed={isActive}
    >
      {label}
      <span className="list-header-col__sort-icon" aria-hidden="true">
        {isActive ? (sortOrder === 'ASC' ? '▲' : '▼') : '↕'}
      </span>
    </button>
  );
}

export function SeriesListView({ displaySeries, activeFilterCount, onResetFilter, sortBy, sortOrder, onSortChange }: SeriesListViewProps) {
  return (
    <div className="list-container">
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
        <>
          <div className="list-table-header">
            <div className="list-header-col">ปก</div>
            <SortableCol label="ชื่อเรื่อง & ผู้เขียน" sortKey="title" defaultOrder="ASC" sortBy={sortBy} sortOrder={sortOrder} onSortChange={onSortChange} />
            <div className="list-header-col">ประเภท & สถานะ</div>
            <SortableCol label="ความคืบหน้า" sortKey="readProgress" defaultOrder="DESC" sortBy={sortBy} sortOrder={sortOrder} onSortChange={onSortChange} />
            <SortableCol label="การสะสม / เล่มขาด" sortKey="missingCount" defaultOrder="DESC" sortBy={sortBy} sortOrder={sortOrder} onSortChange={onSortChange} />
            <SortableCol label="คะแนน" sortKey="rating" defaultOrder="DESC" sortBy={sortBy} sortOrder={sortOrder} onSortChange={onSortChange} className="list-header-col--center" />
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

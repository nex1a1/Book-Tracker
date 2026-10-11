import { useRef } from "react";
import { SeriesListItem } from "./SeriesListItem";
import { useFlipList } from "../hooks/useFlipList";
import { Series } from "../../../types";
import { SortableCol } from "./SortableCol";

interface SeriesListViewProps {
  displaySeries: Series[];
  activeFilterCount: number;
  onResetFilter: () => void;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
  onSortChange: (sortBy: string, sortOrder: 'ASC' | 'DESC') => void;
}

export function SeriesListView({ displaySeries, activeFilterCount, onResetFilter, sortBy, sortOrder, onSortChange }: SeriesListViewProps) {
  const listRef = useRef<HTMLDivElement>(null);
  useFlipList(listRef);
  return (
    <div className="list-container" ref={listRef}>
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
            <SortableCol label="ชื่อเรื่อง" sortKey="title" defaultOrder="ASC" sortBy={sortBy} sortOrder={sortOrder} onSortChange={onSortChange} />
            <SortableCol label="การอ่าน" sortKey="readProgress" defaultOrder="DESC" sortBy={sortBy} sortOrder={sortOrder} onSortChange={onSortChange} />
            <SortableCol label="การสะสม & เล่มขาด" sortKey="missingCount" defaultOrder="DESC" sortBy={sortBy} sortOrder={sortOrder} onSortChange={onSortChange} />
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

import React from 'react';
import { Icons } from '../../../components/Icons';
import { FilterState, SeriesType, SeriesStatus } from '../../../types';

interface ExportFilterPopoverProps {
  popoverRef: React.RefObject<HTMLDivElement>;
  filter: FilterState;
  publisherList: string[];
  matchedCount: number;
  localFilterCount: number;
  onUpdate: (f: Partial<FilterState>) => void;
  onToggleArray: (key: 'type' | 'status' | 'readStatus' | 'collectStatus', val: string) => void;
  onReset: () => void;
  onDone: () => void;
}

export function ExportFilterPopover({
  popoverRef, filter, publisherList, matchedCount, localFilterCount, onUpdate, onToggleArray, onReset, onDone,
}: ExportFilterPopoverProps) {
  return (
    <div ref={popoverRef} className="export-columns-popover filter-data-popover detailed">
      <div className="popover-header">
        <div className="popover-title">
          <Icons.Filter /> ตัวกรองข้อมูลซีรีส์แบบละเอียด
        </div>
        {localFilterCount > 0 && (
          <button type="button" className="btn-link danger" onClick={onReset}>
            ล้างตัวกรอง ({localFilterCount})
          </button>
        )}
      </div>

      <div className="filter-popover-body">
        {/* Search Input */}
        <div className="filter-field">
          <label className="field-label">ค้นหาข้อความ:</label>
          <div className="search-input-wrapper">
            <Icons.Search />
            <input
              type="text"
              placeholder="ค้นหาชื่อเรื่อง, ผู้แต่ง, สำนักพิมพ์..."
              value={filter.search || ''}
              onChange={e => onUpdate({ search: e.target.value })}
              className="input-text"
            />
          </div>
        </div>

        {/* Series Type */}
        <div className="filter-field">
          <label className="field-label">ประเภทหนังสือ:</label>
          <div className="filter-pill-group">
            <button
              type="button"
              className={`mini-pill ${filter.type.length === 0 ? 'active' : ''}`}
              onClick={() => onUpdate({ type: [] })}
            >
              ทั้งหมด
            </button>
            {[
              { id: 'manga', label: 'Manga' },
              { id: 'novel', label: 'Novel' },
              { id: 'light_novel', label: 'Light Novel' },
            ].map(t => (
              <button
                key={t.id}
                type="button"
                className={`mini-pill ${filter.type.includes(t.id as SeriesType) ? 'active' : ''}`}
                onClick={() => onToggleArray('type', t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Series Status */}
        <div className="filter-field">
          <label className="field-label">สถานะการตีพิมพ์:</label>
          <div className="filter-pill-group">
            <button
              type="button"
              className={`mini-pill ${filter.status.length === 0 ? 'active' : ''}`}
              onClick={() => onUpdate({ status: [] })}
            >
              ทั้งหมด
            </button>
            {[
              { id: 'ongoing', label: 'ยังไม่จบ' },
              { id: 'completed', label: 'จบแล้ว' },
              { id: 'hiatus', label: 'หยุดชั่วคราว' },
              { id: 'cancelled', label: 'โดนตัดจบ' },
            ].map(s => (
              <button
                key={s.id}
                type="button"
                className={`mini-pill ${filter.status.includes(s.id as SeriesStatus) ? 'active' : ''}`}
                onClick={() => onToggleArray('status', s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Read Status */}
        <div className="filter-field">
          <label className="field-label">สถานะการอ่าน:</label>
          <div className="filter-pill-group">
            <button
              type="button"
              className={`mini-pill ${filter.readStatus.length === 0 ? 'active' : ''}`}
              onClick={() => onUpdate({ readStatus: [] })}
            >
              ทั้งหมด
            </button>
            {[
              { id: 'finished', label: 'อ่านจบสมบูรณ์' },
              { id: 'caughtup', label: 'ทันปัจจุบัน' },
              { id: 'reading', label: 'กำลังอ่าน' },
              { id: 'unread', label: 'สายดอง' },
            ].map(rs => (
              <button
                key={rs.id}
                type="button"
                className={`mini-pill ${filter.readStatus.includes(rs.id) ? 'active' : ''}`}
                onClick={() => onToggleArray('readStatus', rs.id)}
              >
                {rs.label}
              </button>
            ))}
          </div>
        </div>

        {/* Collection Status */}
        <div className="filter-field">
          <label className="field-label">สถานะการสะสม:</label>
          <div className="filter-pill-group">
            <button
              type="button"
              className={`mini-pill ${filter.collectStatus.length === 0 ? 'active' : ''}`}
              onClick={() => onUpdate({ collectStatus: [] })}
            >
              ทั้งหมด
            </button>
            {[
              { id: 'complete', label: 'ครบถ้วน' },
              { id: 'missing', label: 'ยังขาดอยู่' },
              { id: 'not_collecting', label: 'ไม่สะสม' },
            ].map(cs => (
              <button
                key={cs.id}
                type="button"
                className={`mini-pill ${filter.collectStatus.includes(cs.id) ? 'active' : ''}`}
                onClick={() => onToggleArray('collectStatus', cs.id)}
              >
                {cs.label}
              </button>
            ))}
          </div>
        </div>

        {/* Min Rating */}
        <div className="filter-field">
          <label className="field-label">คะแนนขั้นต่ำ:</label>
          <div className="filter-pill-group">
            <button
              type="button"
              className={`mini-pill ${!filter.minRating ? 'active' : ''}`}
              onClick={() => onUpdate({ minRating: 0 })}
            >
              ทั้งหมด
            </button>
            {[1, 2, 3, 4, 5].map(r => (
              <button
                key={r}
                type="button"
                className={`mini-pill ${filter.minRating === r ? 'active' : ''}`}
                onClick={() => onUpdate({ minRating: filter.minRating === r ? 0 : r })}
              >
                {'★'.repeat(r)}
              </button>
            ))}
          </div>
        </div>

        {/* Publisher Select */}
        {publisherList.length > 0 && (
          <div className="filter-field">
            <label className="field-label">สำนักพิมพ์:</label>
            <select
              value={filter.publisher || ''}
              onChange={e => onUpdate({ publisher: e.target.value })}
              className="select-input"
            >
              <option value="">ทุกสำนักพิมพ์</option>
              {publisherList.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="popover-footer">
        <span>กรองได้ <strong>{matchedCount}</strong> เรื่อง</span>
        <button type="button" className="btn btn--sm btn--primary" onClick={onDone}>
          ตกลง
        </button>
      </div>
    </div>
  );
}

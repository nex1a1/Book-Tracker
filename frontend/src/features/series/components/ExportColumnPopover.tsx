import React from 'react';
import { Icons } from '../../../components/Icons';
import { CsvColumnOption } from '../../../utils/csvHelper';

interface ExportColumnPopoverProps {
  popoverRef: React.RefObject<HTMLDivElement>;
  columns: CsvColumnOption[];
  selectedKeys: string[];
  unselectedColumns: CsvColumnOption[];
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onMoveColumn: (index: number, direction: 'up' | 'down') => void;
  onToggleColumn: (key: string) => void;
  onDone: () => void;
}

export function ExportColumnPopover({
  popoverRef, columns, selectedKeys, unselectedColumns, onSelectAll, onDeselectAll, onMoveColumn, onToggleColumn, onDone,
}: ExportColumnPopoverProps) {
  return (
    <div ref={popoverRef} className="export-columns-popover reorder-popover">
      <div className="popover-header">
        <div className="popover-title">
          <Icons.Sliders /> เลือกและจัดลำดับคอลัมน์
        </div>
        <div className="export-column-actions">
          <button type="button" className="btn-link" onClick={onSelectAll}>
            เลือกทั้งหมด
          </button>
          <span className="divider-dot">•</span>
          <button type="button" className="btn-link" onClick={onDeselectAll}>
            ที่จำเป็น
          </button>
        </div>
      </div>

      <div className="popover-reorder-container">
        <label className="field-label" style={{ marginBottom: '6px', display: 'block' }}>
          คอลัมน์ที่เลือกส่งออก (กด ▲/▼ เพื่อสลับลำดับ):
        </label>
        <div className="reorder-list">
          {selectedKeys.map((key, idx) => {
            const col = columns.find(c => c.key === key);
            if (!col) return null;
            return (
              <div key={key} className="reorder-item">
                <div className="reorder-btn-group">
                  <button
                    type="button"
                    className="btn-order"
                    disabled={idx === 0}
                    onClick={() => onMoveColumn(idx, 'up')}
                    title="เลื่อนขึ้น / สลับไปซ้าย"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    className="btn-order"
                    disabled={idx === selectedKeys.length - 1}
                    onClick={() => onMoveColumn(idx, 'down')}
                    title="เลื่อนลง / สลับไปขวา"
                  >
                    ▼
                  </button>
                </div>
                <span className="order-idx">{idx + 1}.</span>
                <span className="column-label">{col.label}</span>
                <button
                  type="button"
                  className="btn-remove-col"
                  onClick={() => onToggleColumn(key)}
                  title="เอาคอลัมน์นี้ออก"
                >
                  <Icons.X />
                </button>
              </div>
            );
          })}
        </div>

        {unselectedColumns.length > 0 && (
          <>
            <label className="field-label" style={{ marginTop: '12px', marginBottom: '6px', display: 'block' }}>
              คอลัมน์อื่นๆ ที่ยังไม่ได้เลือก:
            </label>
            <div className="unselected-columns-grid">
              {unselectedColumns.map(col => (
                <button
                  key={col.key}
                  type="button"
                  className="btn-add-col"
                  onClick={() => onToggleColumn(col.key)}
                >
                  <Icons.Plus /> {col.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="popover-footer">
        <span>เลือกแล้ว {selectedKeys.length} คอลัมน์</span>
        <button type="button" className="btn btn--sm btn--primary" onClick={onDone}>
          ตกลง
        </button>
      </div>
    </div>
  );
}

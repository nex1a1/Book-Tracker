import type { HTMLAttributes } from "react";
import { Icons } from "../../../components/Icons";
import { MissingSeriesItem, MissingLogItem } from "../hooks/useMissingVolumes";
import { CHECKLIST_COLUMNS, ChecklistColumn, DEFAULT_CHECKLIST_COLUMNS } from "./ChecklistColumns";

const DEFAULT_COLUMNS = CHECKLIST_COLUMNS.filter(c => DEFAULT_CHECKLIST_COLUMNS.includes(c.key));

interface MissingVolumeRowProps {
  item: MissingSeriesItem;
  f: MissingLogItem;
  isChecked: boolean;
  onToggleCheck: () => void;
  onEdit: () => void;
  onCopySingle: () => void;
  columns?: ChecklistColumn[];
  /** Drag-to-reorder handlers for the row; the drag itself starts from the ⋮⋮ handle */
  drag?: HTMLAttributes<HTMLDivElement>;
  dropSide?: 'before' | 'after';
  isDragging?: boolean;
}

export function MissingVolumeRow({ item, f, isChecked, onToggleCheck, onEdit, onCopySingle, columns = DEFAULT_COLUMNS, drag, dropSide, isDragging }: MissingVolumeRowProps) {
  return (
    <div
      className={`checklist-item-row ${isChecked ? "is-checked" : ""} ${dropSide ? `is-drop-${dropSide}` : ""} ${isDragging ? "is-dragging" : ""}`}
      data-vt-key={`${item._id}-${f.id}`}
      {...drag}
    >
      <div className="checklist-item-checkbox-wrapper">
        {drag && <span className="checklist-drag-handle" draggable title="ลากเพื่อจัดลำดับ">⋮⋮</span>}
        <button
          type="button"
          role="checkbox"
          aria-checked={isChecked}
          className="checklist-custom-checkbox"
          onClick={onToggleCheck}
          title={isChecked ? "ยกเลิกการเลือก" : "ทำเครื่องหมายว่าหยิบแล้ว"}
        >
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 4L4 7L9 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="checklist-item-title-col">
        <h4 className="checklist-item-title" title={item.title}>{item.title}</h4>
        <span className={`badge checklist-item-badge badge--${item.rawType}`}>{item.typeStr}</span>
      </div>

      {columns.map(c => (
        <div key={c.key} className={`checklist-item-col checklist-item-${c.key}-col`}>{c.text(item, f) || <span className="checklist-empty-field">-</span>}</div>
      ))}

      <div className="checklist-item-missing-col">
        {f.title && f.title !== "เล่มปกติ" && (
          <span className="checklist-item-format" title={f.title}>{f.title}</span>
        )}
        <span className="checklist-item-missing-volumes">เล่ม {f.missingText}</span>
        <span className="checklist-item-missing-count">{f.missingCount} เล่ม</span>
      </div>

      <div className="checklist-item-actions">
        <button 
          type="button"
          className="checklist-row-btn checklist-row-btn--edit" 
          onClick={onEdit}
          title="แก้ไขรายละเอียดเรื่องนี้"
        >
          <Icons.Edit />
        </button>
        <button 
          type="button"
          className="checklist-row-btn checklist-row-btn--copy" 
          onClick={onCopySingle}
          title="คัดลอกข้อมูลเรื่องนี้"
        >
          <Icons.Copy />
        </button>
      </div>
    </div>
  );
}

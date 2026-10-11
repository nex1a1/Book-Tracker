import { ReactNode, useEffect, useRef, useState } from "react";
import { Icons } from "../../../components/Icons";
import { STATUS_LABEL } from "../../../utils/constants";
import { ChecklistSortKey, MissingLogItem, MissingSeriesItem } from "../hooks/useMissingVolumes";

// Optional columns of the missing-volume checklist, in display order. Title, "เล่มที่ขาด" and
// the action buttons are always shown. Header (MissingVolumesModal) and rows (MissingVolumeRow)
// both read this list, so a column is added in one place.
export interface ChecklistColumn {
  key: string;
  label: string;
  hint: string; // what the column holds, shown in the picker
  width: string;
  sortKey?: ChecklistSortKey;
  defaultOrder?: 'ASC' | 'DESC';
  render: (item: MissingSeriesItem, f: MissingLogItem) => ReactNode;
}

const empty = <span className="checklist-empty-field">-</span>;

export const CHECKLIST_COLUMNS: ChecklistColumn[] = [
  { key: 'author', label: 'ผู้แต่ง', hint: 'ข้อความ', width: '1.5fr', sortKey: 'author', render: item => item.author || empty },
  {
    key: 'publisher', label: 'สำนักพิมพ์', hint: 'ข้อความ', width: '1.2fr', sortKey: 'publisher',
    render: item => item.publisher && item.publisher !== "ไม่ระบุสำนักพิมพ์" ? item.publisher : empty,
  },
  { key: 'publishYear', label: 'ปีที่พิมพ์', hint: 'ปี', width: '80px', sortKey: 'publishYear', render: item => item.rawSeries.publishYear || empty },
  { key: 'status', label: 'สถานะ', hint: 'สถานะ', width: '90px', render: item => STATUS_LABEL[item.rawSeries.status] },
  { key: 'total', label: 'ทั้งหมด', hint: 'จำนวน', width: '80px', sortKey: 'total', defaultOrder: 'DESC', render: (_, f) => `${f.totalVolumes} เล่ม` },
  { key: 'owned', label: 'มีแล้ว', hint: 'จำนวน', width: '80px', sortKey: 'owned', defaultOrder: 'DESC', render: (_, f) => `${f.totalVolumes - f.missingCount} เล่ม` },
];

// Shown every time the checklist opens; the choice is not remembered.
export const DEFAULT_CHECKLIST_COLUMNS = ['author', 'publisher'];

// checkbox | title | optional columns | missing | actions
export const checklistGridTemplate = (columns: ChecklistColumn[]) =>
  ['24px', '2.5fr', ...columns.map(c => c.width), 'minmax(220px, 1.8fr)', '60px'].join(' ');

const isDefault = (keys: string[]) =>
  keys.length === DEFAULT_CHECKLIST_COLUMNS.length && DEFAULT_CHECKLIST_COLUMNS.every(k => keys.includes(k));

interface ChecklistColumnPickerProps {
  visible: string[];
  onChange: (keys: string[]) => void;
}

// Same anatomy as PublisherDropdown's multi-select menu (actions / list / footer), with its own
// touches: a "kind" tag per column, a dot on the default columns, solid checkboxes.
export function ChecklistColumnPicker({ visible, onChange }: ChecklistColumnPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc, true);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc, true);
    };
  }, [open]);

  // Keep the config order whatever order the boxes were ticked in.
  const toggle = (key: string) => onChange(CHECKLIST_COLUMNS.map(c => c.key)
    .filter(k => k === key ? !visible.includes(k) : visible.includes(k)));
  const changed = !isDefault(visible);

  return (
    <div className="col-picker" ref={ref}>
      <button
        type="button"
        className={`col-picker__trigger ${changed ? 'is-changed' : ''} ${open ? 'is-open' : ''}`}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        title="เลือกคอลัมน์ที่จะแสดง"
      >
        <Icons.Sliders />
        <span>คอลัมน์</span>
        {changed && <span className="col-picker__badge">{visible.length}</span>}
        <span className="col-picker__chevron"><Icons.ChevronDown /></span>
      </button>
      {open && (
        <div className="col-picker__menu" role="group" aria-label="คอลัมน์ที่แสดง">
          <div className="col-picker__actions">
            <button type="button" className="col-picker__action" onClick={() => onChange(CHECKLIST_COLUMNS.map(c => c.key))}>
              แสดงทั้งหมด ({CHECKLIST_COLUMNS.length})
            </button>
            <button type="button" className="col-picker__action muted" onClick={() => onChange(DEFAULT_CHECKLIST_COLUMNS)} disabled={!changed}>
              ค่าเริ่มต้น
            </button>
          </div>
          <div className="col-picker__caption">ชื่อเรื่อง · เล่มที่ขาด แสดงเสมอ</div>
          <div className="col-picker__list">
            {CHECKLIST_COLUMNS.map(c => {
              const on = visible.includes(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={on}
                  className={`col-picker__item ${on ? 'is-on' : ''}`}
                  onClick={() => toggle(c.key)}
                >
                  <span className="col-picker__box" aria-hidden="true">
                    {on && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </span>
                  <span className="col-picker__label">{c.label}</span>
                  {DEFAULT_CHECKLIST_COLUMNS.includes(c.key) && <span className="col-picker__default-dot" title="ค่าเริ่มต้น" />}
                  <span className="col-picker__hint">{c.hint}</span>
                </button>
              );
            })}
          </div>
          <div className="col-picker__footer">
            <span>แสดง {visible.length}/{CHECKLIST_COLUMNS.length} คอลัมน์</span>
            <button type="button" className="col-picker__done" onClick={() => setOpen(false)}>ตกลง</button>
          </div>
        </div>
      )}
    </div>
  );
}

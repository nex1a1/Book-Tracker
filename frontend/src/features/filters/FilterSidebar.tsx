import React, { useState, useEffect, useId } from "react";
import { Icons } from "../../components/Icons";
import { FilterState } from "../../types";
import './FilterSidebar.css';

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
}

export function FilterSection({ title, children }: FilterSectionProps) {
  const [open, setOpen] = useState(true);
  const bodyId = useId();
  return (
    <div className={`filter-section ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="filter-section__header"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={bodyId}
      >
        <span>{title}</span>
        <span className="filter-section__chevron"><Icons.ChevronDown /></span>
      </button>
      <div className="filter-section__body-wrapper">
        <div className="filter-section__body" id={bodyId}>{children}</div>
      </div>
    </div>
  );
}

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}

export function FilterChip({ label, active, onClick, icon }: FilterChipProps) {
  return (
    <button
      type="button"
      className={`filter-chip ${active ? 'filter-chip--active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      {icon && <span className="filter-chip__icon">{icon}</span>}
      <span className="filter-chip__label">{label}</span>
    </button>
  );
}

interface FilterSidebarProps {
  filter: FilterState;
  setFilter: (f: Partial<FilterState>) => void;
  resetFilter: () => void;
  publishers: string[];
  activeCount: number;
}

export function FilterSidebar({ filter, setFilter, resetFilter, publishers, activeCount }: FilterSidebarProps) {
  const toggleArr = (key: 'type' | 'status' | 'readStatus' | 'collectStatus', val: string) => {
    const arr = (filter[key] as string[]) || [];
    if (arr.includes(val)) {
      setFilter({ [key]: arr.filter(v => v !== val) });
    } else {
      setFilter({ [key]: [...arr, val] });
    }
  };

  // Debounce search so typing doesn't re-filter/re-sort the whole list on every keystroke.
  const [localSearch, setLocalSearch] = useState(filter.search || "");
  useEffect(() => {
    if (filter.search === "" && localSearch !== "") setLocalSearch("");
  }, [filter.search]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (localSearch !== (filter.search || "")) setFilter({ search: localSearch });
    }, 250);
    return () => clearTimeout(t);
  }, [localSearch]);

  const clearSearch = () => {
    setLocalSearch("");
    setFilter({ search: "" });
  };

  return (
    <aside className="filter-sidebar">
      <div className="filter-sidebar__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icons.Sliders />
          <span style={{ fontWeight: 700, fontSize: '.875rem' }}>ตัวกรอง</span>
          {activeCount > 0 && <span className="filter-count-badge">{activeCount}</span>}
        </div>
        {activeCount > 0 && (
          <button 
            type="button" 
            className="btn btn--sm btn--ghost" 
            style={{ padding: '4px 10px', fontSize: '.75rem' }} 
            onClick={resetFilter}
          >
            ล้างทั้งหมด
          </button>
        )}
      </div>

      <div className="filter-sidebar__body">
        <div className="filter-search-wrap">
          <Icons.Search />
          <input
            className="filter-search-input"
            placeholder="ค้นหาชื่อ, ผู้แต่ง, สำนักพิมพ์..."
            aria-label="ค้นหาชื่อ, ผู้แต่ง, สำนักพิมพ์"
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
          />
          {localSearch && (
            <button
              type="button"
              className="filter-search-clear"
              onClick={clearSearch}
            >
              <Icons.X />
            </button>
          )}
        </div>

        <FilterSection title="ประเภท">
          <div className="filter-chip-group">
            <FilterChip label="ทั้งหมด" active={filter.type.length === 0} onClick={() => setFilter({ type: [] })} />
            <FilterChip label="Manga" active={filter.type.includes('manga')} onClick={() => toggleArr('type', 'manga')} />
            <FilterChip label="Novel" active={filter.type.includes('novel')} onClick={() => toggleArr('type', 'novel')} />
            <FilterChip label="Light Novel" active={filter.type.includes('light_novel')} onClick={() => toggleArr('type', 'light_novel')} />
          </div>
        </FilterSection>

        <FilterSection title="สถานะการตีพิมพ์">
          <div className="filter-chip-group">
            <FilterChip label="ทั้งหมด" active={filter.status.length === 0} onClick={() => setFilter({ status: [] })} />
            <FilterChip label="ยังไม่จบ" active={filter.status.includes('ongoing')} onClick={() => toggleArr('status', 'ongoing')} />
            <FilterChip label="จบแล้ว" active={filter.status.includes('completed')} onClick={() => toggleArr('status', 'completed')} />
            <FilterChip label="หยุดชั่วคราว" active={filter.status.includes('hiatus')} onClick={() => toggleArr('status', 'hiatus')} />
            <FilterChip label="โดนตัดจบ" active={filter.status.includes('cancelled')} onClick={() => toggleArr('status', 'cancelled')} />
          </div>
        </FilterSection>

        <FilterSection title="สถานะการอ่าน">
          <div className="filter-chip-group">
            <FilterChip label="ทั้งหมด" active={filter.readStatus.length === 0} onClick={() => setFilter({ readStatus: [] })} />
            <FilterChip icon={<Icons.CheckCircle />} label="อ่านจบสมบูรณ์" active={filter.readStatus.includes('finished')} onClick={() => toggleArr('readStatus', 'finished')} />
            <FilterChip icon={<Icons.Clock />} label="ทันปัจจุบัน" active={filter.readStatus.includes('caughtup')} onClick={() => toggleArr('readStatus', 'caughtup')} />
            <FilterChip icon={<Icons.BookOpen />} label="กำลังอ่าน" active={filter.readStatus.includes('reading')} onClick={() => toggleArr('readStatus', 'reading')} />
            <FilterChip icon={<Icons.Archive />} label="สายดอง" active={filter.readStatus.includes('unread')} onClick={() => toggleArr('readStatus', 'unread')} />
          </div>
        </FilterSection>

        <FilterSection title="สถานะการสะสม">
          <div className="filter-chip-group">
            <FilterChip label="ทั้งหมด" active={filter.collectStatus.length === 0} onClick={() => setFilter({ collectStatus: [] })} />
            <FilterChip icon={<Icons.Sparkles />} label="ครบถ้วน" active={filter.collectStatus.includes('complete')} onClick={() => toggleArr('collectStatus', 'complete')} />
            <FilterChip icon={<Icons.Cart />} label="ยังขาดอยู่" active={filter.collectStatus.includes('missing')} onClick={() => toggleArr('collectStatus', 'missing')} />
            <FilterChip icon={<Icons.Ban />} label="ไม่สะสม" active={filter.collectStatus.includes('not_collecting')} onClick={() => toggleArr('collectStatus', 'not_collecting')} />
          </div>
        </FilterSection>

        <FilterSection title="คะแนน">
          <div className="filter-subgroup-label">อย่างน้อย</div>
          <div className="filter-chip-group">
            <FilterChip label="ทั้งหมด" active={!filter.minRating} onClick={() => setFilter({ minRating: 0 })} />
            {[1, 2, 3, 4, 5].map(r => (
              <FilterChip key={r} label={'★'.repeat(r) + '☆'.repeat(5 - r)} active={filter.minRating === r} onClick={() => setFilter({ minRating: filter.minRating === r ? 0 : r })} />
            ))}
          </div>
          <div className="filter-subgroup-label">ไม่เกิน</div>
          <div className="filter-chip-group">
            <FilterChip label="ทั้งหมด" active={!filter.maxRating} onClick={() => setFilter({ maxRating: 0 })} />
            {[1, 2, 3, 4, 5].map(r => (
              <FilterChip key={r} label={'★'.repeat(r) + '☆'.repeat(5 - r)} active={filter.maxRating === r} onClick={() => setFilter({ maxRating: filter.maxRating === r ? 0 : r })} />
            ))}
          </div>
        </FilterSection>

        <FilterSection title="ปีที่พิมพ์">
          <div className="filter-year-row">
            <input
              type="number"
              className="filter-year-input"
              placeholder="จาก"
              aria-label="ปีที่พิมพ์ ตั้งแต่"
              value={filter.yearFrom}
              onChange={e => setFilter({ yearFrom: e.target.value })}
            />
            <span className="filter-year-sep">–</span>
            <input
              type="number"
              className="filter-year-input"
              placeholder="ถึง"
              aria-label="ปีที่พิมพ์ จนถึง"
              value={filter.yearTo}
              onChange={e => setFilter({ yearTo: e.target.value })}
            />
          </div>
        </FilterSection>

        {publishers.length > 0 && (
          <FilterSection title="สำนักพิมพ์">
            <select
              className="filter-select"
              value={filter.publisher || ""}
              onChange={e => setFilter({ publisher: e.target.value })}
              aria-label="สำนักพิมพ์"
            >
              <option value="">ทุกสำนักพิมพ์</option>
              {publishers.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </FilterSection>
        )}
      </div>
    </aside>
  );
}

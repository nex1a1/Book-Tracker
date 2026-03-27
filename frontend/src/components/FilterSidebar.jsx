import React, { useState } from "react";
import { Icons } from "./Icons";
import './FilterSidebar.css';

export function FilterSection({ title, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="filter-section">
      <button className="filter-section__header" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s', color: 'var(--muted)' }}><Icons.ChevronDown /></span>
      </button>
      {open && <div className="filter-section__body">{children}</div>}
    </div>
  );
}

export function FilterChip({ label, active, onClick, icon }) {
  return (
    <button 
      className={`filter-chip ${active ? 'filter-chip--active' : ''}`} 
      onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
    >
      {icon} {label}
    </button>
  );
}

export function FilterSidebar({ filter, setFilter, resetFilter, publishers, activeCount }) {
  const toggleArr = (key, val) => {
    const arr = filter[key] || [];
    if (arr.includes(val)) setFilter({ [key]: arr.filter(v => v !== val) });
    else setFilter({ [key]: [...arr, val] });
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
          <button className="btn btn--sm btn--ghost" style={{ padding: '4px 10px', fontSize: '.75rem' }} onClick={resetFilter}>
            ล้างทั้งหมด
          </button>
        )}
      </div>

      <div className="filter-sidebar__body">
        <div className="filter-search-wrap">
          <Icons.Search />
          <input className="filter-search-input" placeholder="ค้นหาชื่อ, ผู้แต่ง, สำนักพิมพ์..." value={filter.search || ""} onChange={e => setFilter({ search: e.target.value })} />
          {filter.search && <button className="filter-search-clear" onClick={() => setFilter({ search: '' })}><Icons.X /></button>}
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

        <FilterSection title="คะแนนขั้นต่ำ">
          <div className="filter-chip-group">
            <FilterChip label="ทั้งหมด" active={!filter.minRating} onClick={() => setFilter({ minRating: 0 })} />
            {[1, 2, 3, 4, 5].map(r => (
              <FilterChip key={r} label={'★'.repeat(r) + '☆'.repeat(5 - r)} active={filter.minRating === r} onClick={() => setFilter({ minRating: filter.minRating === r ? 0 : r })} />
            ))}
          </div>
        </FilterSection>

        {publishers.length > 0 && (
          <FilterSection title="สำนักพิมพ์">
            <select className="input" style={{ width: '100%' }} value={filter.publisher || ""} onChange={e => setFilter({ publisher: e.target.value })}>
              <option value="">ทุกสำนักพิมพ์</option>
              {publishers.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </FilterSection>
        )}
      </div>
    </aside>
  );
}
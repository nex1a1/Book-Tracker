import React, { useEffect, useState, useMemo } from "react";
import { Toaster } from "react-hot-toast";
import { Icons } from "./components/Icons";
import { useSeriesStore } from "./store";
import { getSeriesDerivedStats } from "./utils";
import { FilterSidebar } from "./components/FilterSidebar";
import { SeriesCard, SeriesListItem } from "./components/SeriesCard";
import { SeriesInfoModal, MissingVolumesModal } from "./components/Modals";

export default function App() {
  const { series, loading, fetchSeries, fetchStats, stats, filter, setFilter, resetFilter, viewMode, setViewMode } = useSeriesStore();
  
  const [showAdd, setShowAdd] = useState(false);
  const [showMissing, setShowMissing] = useState(false);

  useEffect(() => { fetchSeries(); fetchStats(); }, []);

  const publishers = useMemo(() => {
    const list = series.map(s => s.publisher).filter(p => p && p.trim() !== '');
    return [...new Set(list)].sort();
  }, [series]);

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (filter.search) c++;
    if (filter.type && filter.type.length > 0) c++;
    if (filter.status && filter.status.length > 0) c++;
    if (filter.publisher) c++;
    if (filter.readStatus && filter.readStatus.length > 0) c++;
    if (filter.collectStatus && filter.collectStatus.length > 0) c++;
    if (filter.minRating) c++;
    if (filter.maxRating) c++;
    if (filter.yearFrom) c++;
    if (filter.yearTo) c++;
    return c;
  }, [filter]);

  const displaySeries = useMemo(() => {
    let filtered = series;

    if (filter.search) {
      const q = filter.search.toLowerCase();
      filtered = filtered.filter(s =>
        s.title.toLowerCase().includes(q) ||
        (s.author && s.author.toLowerCase().includes(q)) ||
        (s.publisher && s.publisher.toLowerCase().includes(q))
      );
    }
    
    // กรองข้อมูล (รองรับการกรองทั้งแบบเก่าและแบบ Array ใหม่)
    if (filter.type && filter.type.length > 0) {
      filtered = filtered.filter(s => Array.isArray(filter.type) ? filter.type.includes(s.type) : filter.type === s.type);
    }
    if (filter.status && filter.status.length > 0) {
      filtered = filtered.filter(s => Array.isArray(filter.status) ? filter.status.includes(s.status) : filter.status === s.status);
    }
    
    if (filter.publisher) filtered = filtered.filter(s => s.publisher === filter.publisher);
    if (filter.yearFrom) filtered = filtered.filter(s => s.publishYear >= Number(filter.yearFrom));
    if (filter.yearTo) filtered = filtered.filter(s => s.publishYear <= Number(filter.yearTo));

    if (filter.minRating) filtered = filtered.filter(s => (s.rating || 0) >= filter.minRating);
    if (filter.maxRating) filtered = filtered.filter(s => (s.rating || 0) <= filter.maxRating && (s.rating || 0) > 0);

    filtered = filtered.filter(s => {
      const st = getSeriesDerivedStats(s);
      
      if (filter.readStatus && filter.readStatus.length > 0) {
        let matchRead = false;
        const rs = Array.isArray(filter.readStatus) ? filter.readStatus : [filter.readStatus];
        if (rs.includes('finished') && st.isFinishedReading) matchRead = true;
        if (rs.includes('caughtup') && st.isCaughtUp) matchRead = true;
        if (rs.includes('reading') && st.isReading) matchRead = true;
        if (rs.includes('unread') && st.isUnread) matchRead = true;
        if (!matchRead) return false;
      }

      if (filter.collectStatus && filter.collectStatus.length > 0) {
        let matchCollect = false;
        const cs = Array.isArray(filter.collectStatus) ? filter.collectStatus : [filter.collectStatus];
        if (cs.includes('complete') && st.isCollectComplete) matchCollect = true;
        if (cs.includes('missing') && st.isCollectMissing) matchCollect = true;
        if (cs.includes('not_collecting') && st.isNotCollecting) matchCollect = true;
        if (!matchCollect) return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      let valA = a[filter.sortBy];
      let valB = b[filter.sortBy];
      if (filter.sortBy === 'updatedAt' || filter.sortBy === 'createdAt') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }
      if (filter.sortBy === 'rating') {
        valA = a.rating || 0;
        valB = b.rating || 0;
      }
      if (valA < valB) return filter.sortOrder === 'ASC' ? -1 : 1;
      if (valA > valB) return filter.sortOrder === 'ASC' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [series, filter]);

  return (
    <div className="app-root">
      <Toaster position="bottom-right" />

      <header className="top-header">
        <div className="top-header__brand">
          <h1><span style={{color: 'var(--accent)'}}>卍</span> Manga Tracker</h1>
        </div>

        {stats && (
          <div className="top-header__stats">
            <div className="stat-pill"><strong>{stats.totals.totalSeries}</strong><span>เรื่องทั้งหมด</span></div>
            <div className="stat-pill"><strong>{stats.totals.collecting}</strong><span>กำลังสะสม</span></div>
            <div className="stat-pill"><strong>{stats.totals.totalRead}</strong><span>เล่มที่อ่านแล้ว</span></div>
          </div>
        )}

        <div className="top-header__actions">
          <div className="view-toggle">
            <button className={`view-toggle__btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Grid View"><Icons.Grid /></button>
            <button className={`view-toggle__btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="List View"><Icons.List /></button>
          </div>

          <div className="sort-inline">
            <select className="input input--sm" value={filter.sortBy} onChange={e => setFilter({ sortBy: e.target.value })}>
              <option value="updatedAt">อัปเดตล่าสุด</option>
              <option value="title">ชื่อเรื่อง A–Z</option>
              <option value="publishYear">ปีที่พิมพ์</option>
              <option value="rating">คะแนน</option>
              <option value="createdAt">วันที่เพิ่ม</option>
            </select>
            <button
              className="btn-icon sort-dir-btn"
              title={filter.sortOrder === 'DESC' ? 'มากไปน้อย' : 'น้อยไปมาก'}
              onClick={() => setFilter({ sortOrder: filter.sortOrder === 'DESC' ? 'ASC' : 'DESC' })}
            >
              {filter.sortOrder === 'DESC' ? <Icons.SortDesc /> : <Icons.SortAsc />}
            </button>
          </div>

          <button className="btn btn--ghost" onClick={() => setShowMissing(true)}>
            <Icons.Receipt /> เช็กลิสต์ที่ขาด
          </button>

          <button className="btn btn--primary btn--add" onClick={() => setShowAdd(true)}>
            <Icons.Plus /> เพิ่มเรื่องใหม่
          </button>
        </div>
      </header>

      <div className="main-layout">
        <FilterSidebar
          filter={filter}
          setFilter={setFilter}
          resetFilter={resetFilter}
          publishers={publishers}
          activeCount={activeFilterCount}
        />

        <main className="main-content">
          <div className="content-meta">
            <span>แสดง <strong>{displaySeries.length}</strong> จากทั้งหมด <strong>{series.length}</strong> เรื่อง</span>
            {activeFilterCount > 0 && (
              <button className="btn btn--sm btn--ghost" onClick={resetFilter} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Icons.X /> ล้างตัวกรอง ({activeFilterCount})
              </button>
            )}
          </div>

          {loading ? (
            <div className="loading"><div className="loading__spinner" /></div>
          ) : (
            <div className={viewMode === 'grid' ? 'card-grid' : 'list-container'}>
              {displaySeries.map(s => (
                viewMode === 'grid'
                  ? <SeriesCard key={s._id} series={s} />
                  : <SeriesListItem key={s._id} series={s} />
              ))}
              {displaySeries.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state__icon">📚</div>
                  <h3>ไม่พบหนังสือที่คุณหา</h3>
                  <p>ลองปรับตัวกรอง หรือล้างการค้นหาดูนะครับ</p>
                  {activeFilterCount > 0 && (
                    <button className="btn btn--ghost" style={{ marginTop: '12px' }} onClick={resetFilter}>ล้างตัวกรองทั้งหมด</button>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {showAdd && <SeriesInfoModal onClose={() => setShowAdd(false)} />}
      {showMissing && <MissingVolumesModal onClose={() => setShowMissing(false)} />}
    </div>
  );
}
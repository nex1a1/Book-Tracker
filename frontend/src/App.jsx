import React, { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import { Icons } from "./components/Icons";
import { useSeriesStore } from "./store/useSeriesStore";
import { useFilteredSeries } from "./hooks/useFilteredSeries";
import { FilterSidebar } from "./features/filters/FilterSidebar";
import { SeriesCard, SeriesListItem } from "./features/series/SeriesCard";
import { SeriesInfoModal, MissingVolumesModal } from "./features/modals/Modals";

export default function App() {
  const { 
    series, loading, fetchSeries, fetchStats, fetchMetadata, 
    stats, publishers, filter, setFilter, resetFilter, 
    viewMode, setViewMode 
  } = useSeriesStore();
  
  const [showAdd, setShowAdd] = useState(false);
  const [showMissing, setShowMissing] = useState(false);

  useEffect(() => { 
    fetchSeries(); 
    fetchStats(); 
    fetchMetadata(); 
  }, []);

  const { displaySeries, activeFilterCount } = useFilteredSeries(series, filter);

  const publisherList = React.useMemo(() => {
    return publishers.map(p => p.name);
  }, [publishers]);

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
          publishers={publisherList}
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

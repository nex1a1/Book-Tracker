import React, { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import { Icons } from "./components/Icons";
import { useSeriesStore } from "./store/useSeriesStore";
import { FilterSidebar } from "./features/filters/FilterSidebar";
import {
  SeriesGridView,
  SeriesListView,
  SeriesInfoModal,
  MissingVolumesModal,
  ExportCsvModal,
  useFilteredSeries,
  useMissingVolumes
} from "./features/series";
import { SortDropdown } from "./components/SortDropdown";

export default function App() {
  const {
    series, loading, fetchSeries, fetchStats, fetchMetadata,
    stats, publishers, filter, setFilter, resetFilter,
    viewMode, setViewMode
  } = useSeriesStore();

  const [showAdd, setShowAdd] = useState(false);
  const [showMissing, setShowMissing] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const missing = useMissingVolumes();

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
          <span className="brand-emblem">卍</span>
          <span className="brand-title">Manga <span className="brand-title--highlight">Tracker</span></span>
          <div className="status-indicator">
            <span className="status-dot"></span>
            <span className="status-text">Live DB</span>
          </div>
        </div>

        {stats && (
          <div className="top-header__stats">
            <div className="stat-card" style={{ '--stat-color': 'var(--accent)', '--stat-glow': 'rgba(255, 123, 0, 0.12)' }} title="เรื่องทั้งหมดในระบบ">
              <div className="stat-card__icon"><Icons.Book /></div>
              <div className="stat-card__info">
                <span className="stat-card__label">เรื่องทั้งหมด</span>
                <span className="stat-card__value">{stats.totals.totalSeries}</span>
              </div>
            </div>

            <div className="stat-card" style={{ '--stat-color': 'var(--badge-manga)', '--stat-glow': 'rgba(168, 85, 247, 0.12)' }} title="เรื่องที่กำลังสะสมอยู่">
              <div className="stat-card__icon"><Icons.Archive /></div>
              <div className="stat-card__info">
                <span className="stat-card__label">กำลังสะสม</span>
                <span className="stat-card__value">{stats.totals.collecting}</span>
              </div>
            </div>

            <div className="stat-card" style={{ '--stat-color': 'var(--badge-finished)', '--stat-glow': 'rgba(16, 185, 129, 0.12)' }} title="เล่มที่อ่านแล้วทั้งหมด">
              <div className="stat-card__icon"><Icons.BookOpen /></div>
              <div className="stat-card__info">
                <span className="stat-card__label">เล่มที่อ่านแล้ว</span>
                <span className="stat-card__value">{stats.totals.totalRead}</span>
              </div>
            </div>

            <button
              type="button"
              className="stat-card stat-card--clickable"
              style={{ '--stat-color': 'var(--special-color)', '--stat-glow': 'rgba(186, 12, 12, 0.12)' }}
              onClick={() => setShowMissing(true)}
              title="เปิดเช็กลิสต์หนังสือที่ยังขาด"
            >
              <div className="stat-card__icon"><Icons.Receipt /></div>
              <div className="stat-card__info">
                <span className="stat-card__label">เล่มที่ยังขาด</span>
                <span className="stat-card__value">{missing.stats.totalVolumes}</span>
              </div>
              <span className="stat-card__go" aria-hidden="true"><Icons.ChevronDown /></span>
            </button>
          </div>
        )}

        <div className="top-header__actions">
          <div className="view-toggle" role="group" aria-label="มุมมองการแสดงผล">
            <button
              type="button"
              className={`view-toggle__btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-pressed={viewMode === 'grid'}
              title="มุมมองตาราง"
            >
              <Icons.Grid />
              <span className="view-toggle__btn-label">ตาราง</span>
            </button>
            <button
              type="button"
              className={`view-toggle__btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              title="มุมมองรายการ"
            >
              <Icons.List />
              <span className="view-toggle__btn-label">รายการ</span>
            </button>
          </div>

          <SortDropdown
            sortBy={filter.sortBy}
            sortOrder={filter.sortOrder}
            onSortByChange={val => setFilter({ sortBy: val })}
            onSortOrderToggle={() => setFilter({ sortOrder: filter.sortOrder === 'DESC' ? 'ASC' : 'DESC' })}
          />

          <button type="button" className="btn btn--ghost" onClick={() => setShowExport(true)}>
            <Icons.Download /> Export CSV
          </button>

          <button type="button" className="btn btn--primary btn--add" onClick={() => setShowAdd(true)}>
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
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={resetFilter}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Icons.X /> ล้างตัวกรอง ({activeFilterCount})
              </button>
            )}
          </div>

          {loading ? (
            <div className="loading"><div className="loading__spinner" /></div>
          ) : (
            viewMode === 'grid' ? (
              <SeriesGridView
                displaySeries={displaySeries}
                activeFilterCount={activeFilterCount}
                onResetFilter={resetFilter}
              />
            ) : (
              <SeriesListView
                displaySeries={displaySeries}
                activeFilterCount={activeFilterCount}
                onResetFilter={resetFilter}
                sortBy={filter.sortBy}
                sortOrder={filter.sortOrder}
                onSortChange={(sortBy, sortOrder) => setFilter({ sortBy, sortOrder })}
              />
            )
          )}
        </main>
      </div>

      {showAdd && <SeriesInfoModal onClose={() => setShowAdd(false)} />}
      {showMissing && <MissingVolumesModal onClose={() => setShowMissing(false)} />}
      {showExport && (
        <ExportCsvModal
          onClose={() => setShowExport(false)}
          allSeries={series}
          filteredSeries={displaySeries}
          hasActiveFilter={activeFilterCount > 0}
        />
      )}
    </div>
  );
}

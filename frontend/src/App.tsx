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
          <div className="telemetry-bar" role="region" aria-label="สถิติระบบ">
            <div
              className="telemetry-item"
              style={{ '--item-accent': 'var(--accent)', '--item-glow': 'rgba(255, 123, 0, 0.2)' }}
              title="เรื่องทั้งหมดในระบบ"
            >
              <span className="telemetry-item__icon"><Icons.Book /></span>
              <div className="telemetry-item__body">
                <span className="telemetry-item__label">เรื่องทั้งหมด</span>
                <span className="telemetry-item__value">{stats.totals.totalSeries.toLocaleString()}</span>
              </div>
            </div>

            <div className="telemetry-divider" aria-hidden="true" />

            <div
              className="telemetry-item"
              style={{ '--item-accent': 'var(--badge-manga)', '--item-glow': 'rgba(168, 85, 247, 0.2)' }}
              title="เรื่องที่กำลังสะสมอยู่"
            >
              <span className="telemetry-item__icon"><Icons.Archive /></span>
              <div className="telemetry-item__body">
                <span className="telemetry-item__label">กำลังสะสม</span>
                <span className="telemetry-item__value">{stats.totals.collecting.toLocaleString()}</span>
              </div>
            </div>

            <div className="telemetry-divider" aria-hidden="true" />

            <div
              className="telemetry-item"
              style={{ '--item-accent': 'var(--badge-finished)', '--item-glow': 'rgba(16, 185, 129, 0.2)' }}
              title="เล่มที่อ่านแล้วทั้งหมด"
            >
              <span className="telemetry-item__icon"><Icons.BookOpen /></span>
              <div className="telemetry-item__body">
                <span className="telemetry-item__label">เล่มที่อ่านแล้ว</span>
                <span className="telemetry-item__value">{stats.totals.totalRead.toLocaleString()}</span>
              </div>
            </div>

            <div className="telemetry-divider" aria-hidden="true" />

            <button
              type="button"
              className="telemetry-item telemetry-item--action"
              style={{ '--item-accent': 'var(--danger-text)', '--item-glow': 'rgba(255, 107, 107, 0.25)' }}
              onClick={() => setShowMissing(true)}
              title="เปิดเช็กลิสต์หนังสือที่ยังขาด"
            >
              <span className="telemetry-item__icon"><Icons.Receipt /></span>
              <div className="telemetry-item__body">
                <span className="telemetry-item__label">
                  เล่มที่ยังขาด
                  <span className="telemetry-item__action-hint" aria-hidden="true">↗</span>
                </span>
                <span className="telemetry-item__value telemetry-item__value--highlight">
                  {missing.stats.totalVolumes.toLocaleString()}
                </span>
              </div>
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

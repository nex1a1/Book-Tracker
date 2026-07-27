import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { Icons } from '../../../components/Icons';
import { Series, FilterState, SeriesType, SeriesStatus } from '../../../types';
import { CSV_COLUMNS, generateCsvData, downloadCsvFile, ExportLayoutMode } from '../../../utils/csvHelper';
import { useFilteredSeries } from '../hooks/useFilteredSeries';
import '../Series.css';

interface ExportCsvModalProps {
  onClose: () => void;
  allSeries: Series[];
  filteredSeries: Series[];
  hasActiveFilter: boolean;
}

const INITIAL_EXPORT_FILTER: FilterState = {
  search: '',
  type: [],
  status: [],
  publisher: '',
  readStatus: [],
  collectStatus: [],
  minRating: 0,
  maxRating: 5,
  yearFrom: '',
  yearTo: '',
  sortBy: 'title',
  sortOrder: 'ASC',
};

export const ExportCsvModal: React.FC<ExportCsvModalProps> = ({
  onClose,
  allSeries,
  filteredSeries: initialFilteredSeries,
  hasActiveFilter,
}) => {
  const [scope, setScope] = useState<'filtered' | 'all'>(
    hasActiveFilter ? 'filtered' : 'all'
  );
  
  const [layoutMode, setLayoutMode] = useState<ExportLayoutMode>('series');

  const [selectedKeys, setSelectedKeys] = useState<string[]>(() =>
    CSV_COLUMNS.filter(c => c.defaultSelected).map(c => c.key)
  );

  const [previewTab, setPreviewTab] = useState<'table' | 'raw'>('table');
  
  // Popover Visibility States
  const [showColumnPopover, setShowColumnPopover] = useState(false);
  const [showFilterPopover, setShowFilterPopover] = useState(false);

  // Full Filter State for Export Modal
  const [exportFilter, setExportFilter] = useState<FilterState>(INITIAL_EXPORT_FILTER);

  const columnPopoverRef = useRef<HTMLDivElement>(null);
  const columnBtnRef = useRef<HTMLButtonElement>(null);

  const filterPopoverRef = useRef<HTMLDivElement>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);

  // Unique Publisher list
  const publisherList = useMemo(() => {
    const set = new Set<string>();
    allSeries.forEach(s => {
      if (s.publisher) set.add(s.publisher);
    });
    return Array.from(set).sort();
  }, [allSeries]);

  // Use identical main app filter hook for export
  const { displaySeries: modalFilteredSeries, activeFilterCount: localFilterCount } = useFilteredSeries(
    allSeries,
    exportFilter
  );

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        columnPopoverRef.current && 
        !columnPopoverRef.current.contains(target) &&
        columnBtnRef.current &&
        !columnBtnRef.current.contains(target)
      ) {
        setShowColumnPopover(false);
      }
      if (
        filterPopoverRef.current && 
        !filterPopoverRef.current.contains(target) &&
        filterBtnRef.current &&
        !filterBtnRef.current.contains(target)
      ) {
        setShowFilterPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateFilter = (f: Partial<FilterState>) => {
    setExportFilter(prev => ({ ...prev, ...f }));
    setScope('filtered');
  };

  const toggleArrayFilter = (key: 'type' | 'status' | 'readStatus' | 'collectStatus', val: string) => {
    const arr = (exportFilter[key] as string[]) || [];
    const nextArr = arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
    updateFilter({ [key]: nextArr });
  };

  const resetExportFilters = () => {
    setExportFilter(INITIAL_EXPORT_FILTER);
  };

  const targetSeriesList = useMemo(() => {
    if (scope === 'all') return allSeries;
    return localFilterCount > 0 ? modalFilteredSeries : initialFilteredSeries;
  }, [scope, allSeries, initialFilteredSeries, modalFilteredSeries, localFilterCount]);

  const { csvString, headers, rows } = useMemo(() => {
    return generateCsvData(targetSeriesList, selectedKeys, false, layoutMode);
  }, [targetSeriesList, selectedKeys, layoutMode]);

  const toggleColumn = (key: string) => {
    setSelectedKeys(prev => {
      if (prev.includes(key)) {
        if (prev.length <= 1) {
          toast.error('ต้องเลือกอย่างน้อย 1 คอลัมน์');
          return prev;
        }
        return prev.filter(k => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  const moveColumn = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedKeys.length) return;
    setSelectedKeys(prev => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const selectAllColumns = () => {
    setSelectedKeys(CSV_COLUMNS.map(c => c.key));
  };

  const deselectAllColumns = () => {
    setSelectedKeys(['title', 'subLogTitle', 'status', 'publishPeriod']);
  };

  const handleDownload = () => {
    if (targetSeriesList.length === 0) {
      toast.error('ไม่มีรายการข้อมูลสำหรับ Export');
      return;
    }
    const { csvString: csvWithBom } = generateCsvData(targetSeriesList, selectedKeys, true, layoutMode);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `manga_tracker_${scope}_${layoutMode}_${dateStr}.csv`;
    downloadCsvFile(csvWithBom, filename);
    toast.success(`ดาวน์โหลดไฟล์ ${filename} สำเร็จแล้ว!`);
  };

  const handleCopy = () => {
    if (targetSeriesList.length === 0) {
      toast.error('ไม่มีรายการข้อมูลสำหรับ Copy');
      return;
    }
    navigator.clipboard.writeText(csvString);
    toast.success('คัดลอกข้อความ CSV เข้า Clipboard แล้ว!');
  };

  const unselectedColumns = useMemo(() => {
    return CSV_COLUMNS.filter(c => !selectedKeys.includes(c.key));
  }, [selectedKeys]);

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal modal--large export-modal" 
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '1680px', width: '99vw', height: '95vh', maxHeight: '97vh' }}
      >
        {/* Modal Header */}
        <div className="modal__header export-modal__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="export-modal__icon">
              <Icons.Download />
            </span>
            <div>
              <h2 className="modal__title" style={{ margin: 0 }}>Export ข้อมูลเป็น CSV</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                ส่งออกข้อมูลซีรีส์ จัดลำดับคอลัมน์ได้ แสดงผล "ไม่ได้เก็บสะสม" เคลียร์ และรองรับการแตกแถวย่อยตามภาค
              </span>
            </div>
          </div>
          <button type="button" className="modal__close" onClick={onClose} title="ปิด">
            <Icons.X />
          </button>
        </div>

        {/* Modal Toolbar */}
        <div className="export-toolbar">
          {/* Scope Selector */}
          <div className="export-toolbar__group">
            <span className="toolbar-label">ขอบเขต:</span>
            <div className="export-scope-selector compact">
              <button
                type="button"
                className={`scope-pill ${scope === 'filtered' ? 'active' : ''}`}
                onClick={() => setScope('filtered')}
              >
                <Icons.Filter />
                <span>รายการที่ผ่านการกรอง</span>
                <span className="scope-pill__badge">{targetSeriesList.length}</span>
              </button>

              <button
                type="button"
                className={`scope-pill ${scope === 'all' ? 'active' : ''}`}
                onClick={() => setScope('all')}
              >
                <Icons.Book />
                <span>รายการทั้งหมด</span>
                <span className="scope-pill__badge">{allSeries.length}</span>
              </button>
            </div>
          </div>

          {/* Row Layout Mode Toggle */}
          <div className="export-toolbar__group">
            <span className="toolbar-label">โหมดแถว:</span>
            <div className="preview-tab-switcher">
              <button
                type="button"
                className={`tab-btn ${layoutMode === 'series' ? 'active' : ''}`}
                onClick={() => setLayoutMode('series')}
                title="1 บรรทัดต่อ 1 เรื่อง (รวมภาคในเซลล์เดียว)"
              >
                <Icons.Book /> 1 เรื่องต่อ 1 แถว
              </button>
              <button
                type="button"
                className={`tab-btn ${layoutMode === 'split_logs' ? 'active' : ''}`}
                onClick={() => setLayoutMode('split_logs')}
                title="แตกบรรทัดใหม่แยกตามภาค (เช่น JJK ภาคหลัก, ภาค 0)"
              >
                <Icons.List /> แตกแถวย่อยตามภาค
              </button>
            </div>
          </div>

          {/* Dedicated Filter Popover Button */}
          <div className="export-toolbar__group" style={{ position: 'relative' }}>
            <button
              ref={filterBtnRef}
              type="button"
              className={`btn btn--ghost filter-popup-btn ${localFilterCount > 0 ? 'active' : ''}`}
              onClick={() => {
                setShowFilterPopover(!showFilterPopover);
                setShowColumnPopover(false);
              }}
            >
              <Icons.Filter />
              <span>ตัวกรองซีรีส์</span>
              {localFilterCount > 0 && (
                <span className="filter-count-pill">{localFilterCount}</span>
              )}
              <Icons.ChevronDown />
            </button>

            {/* Comprehensive Series Filter Popover */}
            {showFilterPopover && (
              <div ref={filterPopoverRef} className="export-columns-popover filter-data-popover detailed">
                <div className="popover-header">
                  <div className="popover-title">
                    <Icons.Filter /> ตัวกรองข้อมูลซีรีส์แบบละเอียด
                  </div>
                  {localFilterCount > 0 && (
                    <button type="button" className="btn-link danger" onClick={resetExportFilters}>
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
                        value={exportFilter.search || ''}
                        onChange={e => updateFilter({ search: e.target.value })}
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
                        className={`mini-pill ${exportFilter.type.length === 0 ? 'active' : ''}`}
                        onClick={() => updateFilter({ type: [] })}
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
                          className={`mini-pill ${exportFilter.type.includes(t.id as SeriesType) ? 'active' : ''}`}
                          onClick={() => toggleArrayFilter('type', t.id)}
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
                        className={`mini-pill ${exportFilter.status.length === 0 ? 'active' : ''}`}
                        onClick={() => updateFilter({ status: [] })}
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
                          className={`mini-pill ${exportFilter.status.includes(s.id as SeriesStatus) ? 'active' : ''}`}
                          onClick={() => toggleArrayFilter('status', s.id)}
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
                        className={`mini-pill ${exportFilter.readStatus.length === 0 ? 'active' : ''}`}
                        onClick={() => updateFilter({ readStatus: [] })}
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
                          className={`mini-pill ${exportFilter.readStatus.includes(rs.id) ? 'active' : ''}`}
                          onClick={() => toggleArrayFilter('readStatus', rs.id)}
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
                        className={`mini-pill ${exportFilter.collectStatus.length === 0 ? 'active' : ''}`}
                        onClick={() => updateFilter({ collectStatus: [] })}
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
                          className={`mini-pill ${exportFilter.collectStatus.includes(cs.id) ? 'active' : ''}`}
                          onClick={() => toggleArrayFilter('collectStatus', cs.id)}
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
                        className={`mini-pill ${!exportFilter.minRating ? 'active' : ''}`}
                        onClick={() => updateFilter({ minRating: 0 })}
                      >
                        ทั้งหมด
                      </button>
                      {[1, 2, 3, 4, 5].map(r => (
                        <button
                          key={r}
                          type="button"
                          className={`mini-pill ${exportFilter.minRating === r ? 'active' : ''}`}
                          onClick={() => updateFilter({ minRating: exportFilter.minRating === r ? 0 : r })}
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
                        value={exportFilter.publisher || ''}
                        onChange={e => updateFilter({ publisher: e.target.value })}
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
                  <span>กรองได้ <strong>{modalFilteredSeries.length}</strong> เรื่อง</span>
                  <button type="button" className="btn btn--sm btn--primary" onClick={() => setShowFilterPopover(false)}>
                    ตกลง
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Dedicated Column Selector & Reordering Popover Button */}
          <div className="export-toolbar__group" style={{ position: 'relative' }}>
            <button
              ref={columnBtnRef}
              type="button"
              className={`btn btn--ghost filter-popup-btn ${showColumnPopover ? 'active' : ''}`}
              onClick={() => {
                setShowColumnPopover(!showColumnPopover);
                setShowFilterPopover(false);
              }}
            >
              <Icons.Sliders />
              <span>เลือกคอลัมน์ส่งออก</span>
              <span className="filter-count-pill">{selectedKeys.length}/{CSV_COLUMNS.length}</span>
              <Icons.ChevronDown />
            </button>

            {/* Floating Column Selector Popover with Reordering */}
            {showColumnPopover && (
              <div ref={columnPopoverRef} className="export-columns-popover reorder-popover">
                <div className="popover-header">
                  <div className="popover-title">
                    <Icons.Sliders /> เลือกและจัดลำดับคอลัมน์
                  </div>
                  <div className="export-column-actions">
                    <button type="button" className="btn-link" onClick={selectAllColumns}>
                      เลือกทั้งหมด
                    </button>
                    <span className="divider-dot">•</span>
                    <button type="button" className="btn-link" onClick={deselectAllColumns}>
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
                      const col = CSV_COLUMNS.find(c => c.key === key);
                      if (!col) return null;
                      return (
                        <div key={key} className="reorder-item">
                          <div className="reorder-btn-group">
                            <button
                              type="button"
                              className="btn-order"
                              disabled={idx === 0}
                              onClick={() => moveColumn(idx, 'up')}
                              title="เลื่อนขึ้น / สลับไปซ้าย"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              className="btn-order"
                              disabled={idx === selectedKeys.length - 1}
                              onClick={() => moveColumn(idx, 'down')}
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
                            onClick={() => toggleColumn(key)}
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
                            onClick={() => toggleColumn(col.key)}
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
                  <button type="button" className="btn btn--sm btn--primary" onClick={() => setShowColumnPopover(false)}>
                    ตกลง
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* View Tab Switcher */}
          <div className="export-toolbar__group" style={{ marginLeft: 'auto' }}>
            <div className="preview-tab-switcher">
              <button
                type="button"
                className={`tab-btn ${previewTab === 'table' ? 'active' : ''}`}
                onClick={() => setPreviewTab('table')}
              >
                <Icons.Grid /> ตารางตัวอย่าง
              </button>
              <button
                type="button"
                className={`tab-btn ${previewTab === 'raw' ? 'active' : ''}`}
                onClick={() => setPreviewTab('raw')}
              >
                <Icons.Copy /> ข้อความ CSV
              </button>
            </div>
          </div>
        </div>

        {/* Modal Main Body (Full-height Preview Table Area) */}
        <div className="modal__body export-modal__body full-flex">
          <div className="export-preview-container expanded">
            {targetSeriesList.length === 0 ? (
              <div className="preview-empty">
                <Icons.Info /> ไม่พบรายการซีรีส์ตามขอบเขตที่เลือก
              </div>
            ) : previewTab === 'table' ? (
              <div className="preview-table-wrapper">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th className="row-num-col">#</th>
                      {headers.map((h, idx) => (
                        <th key={idx}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        <td className="row-num-col">{rIdx + 1}</td>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} title={cell}>
                            {cell || <span className="text-muted">-</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="preview-raw-wrapper">
                <pre className="preview-raw-code">{csvString}</pre>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal__footer" style={{ justifyContent: 'space-between' }}>
          <div className="export-summary-text">
            พร้อมส่งออก <strong>{rows.length}</strong> แถว CSV (<strong>{targetSeriesList.length}</strong> เรื่อง) | <strong>{selectedKeys.length}</strong> คอลัมน์
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn--ghost" onClick={handleCopy} disabled={targetSeriesList.length === 0}>
              <Icons.Copy /> คัดลอก CSV
            </button>
            <button type="button" className="btn btn--primary" onClick={handleDownload} disabled={targetSeriesList.length === 0}>
              <Icons.Download /> ดาวน์โหลดไฟล์ CSV
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { Icons } from '../../../components/Icons';
import { Series, FilterState } from '../../../types';
import { CSV_COLUMNS, generateCsvData, downloadCsvFile, ExportLayoutMode } from '../../../utils/csvHelper';
import { useFilteredSeries } from '../hooks/useFilteredSeries';
import { ExportFilterPopover } from './ExportFilterPopover';
import { ExportColumnPopover } from './ExportColumnPopover';
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

          {/* Dedicated Filter Popover Button (Placed right after Scope!) */}
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
              <ExportFilterPopover
                popoverRef={filterPopoverRef}
                filter={exportFilter}
                publisherList={publisherList}
                matchedCount={modalFilteredSeries.length}
                localFilterCount={localFilterCount}
                onUpdate={updateFilter}
                onToggleArray={toggleArrayFilter}
                onReset={resetExportFilters}
                onDone={() => setShowFilterPopover(false)}
              />
            )}
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
              <ExportColumnPopover
                popoverRef={columnPopoverRef}
                columns={CSV_COLUMNS}
                selectedKeys={selectedKeys}
                unselectedColumns={unselectedColumns}
                onSelectAll={selectAllColumns}
                onDeselectAll={deselectAllColumns}
                onMoveColumn={moveColumn}
                onToggleColumn={toggleColumn}
                onDone={() => setShowColumnPopover(false)}
              />
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

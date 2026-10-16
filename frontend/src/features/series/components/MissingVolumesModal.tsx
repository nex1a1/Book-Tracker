import { useState, DragEvent } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { Icons } from "../../../components/Icons";
import { closeModal, morphRows } from "../../../utils/viewTransition";
import '../Series.css';
import { SeriesInfoModal } from "./SeriesInfoModal";

// Sub-components & hooks
import { useMissingVolumes, MissingSeriesItem, MissingLogItem, ChecklistSortKey } from "../hooks/useMissingVolumes";
import { MissingVolumeRow } from "./MissingVolumeRow";
import { SortableCol } from "./SortableCol";
import { CHECKLIST_COLUMNS, DEFAULT_CHECKLIST_COLUMNS, ChecklistColumnPicker, checklistGridTemplate } from "./ChecklistColumns";
import { PublisherDropdown } from "../../../components/PublisherDropdown";
import { Series } from "../../../types";

interface MissingVolumesModalProps {
  onClose: () => void;
}

export function MissingVolumesModal({ onClose }: MissingVolumesModalProps) {
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_CHECKLIST_COLUMNS);
  const columns = CHECKLIST_COLUMNS.filter(c => visibleColumns.includes(c.key));

  const {
    searchQuery,
    setSearchQuery,
    selectedPublisher,
    setSelectedPublisher,
    viewMode,
    setViewMode,
    sortBy,
    sortOrder,
    setSort,
    moveSeries,
    hasCustomOrder,
    resetOrder,
    checkedItems,
    toggleCheckItem,
    clearCheckedItems,
    collapsedPubs,
    toggleCollapsePub,
    filteredList,
    publisherOptions,
    groupedByPublisher,
    stats
  } = useMissingVolumes();
  const isFiltering = searchQuery !== "" || selectedPublisher.length > 0;
  // Keys come from the SortableCol headers below ('' = back to the main list's order). Rows slide to their new order.
  const sortRows = (by: string, order: 'ASC' | 'DESC') =>
    morphRows('.checklist-body', () => setSort(by as ChecklistSortKey | '', order));

  // Drag-to-reorder whole series (a series with several missing logs moves as one). Works while
  // searching/filtering; in the grouped view a series only drops inside its own publisher group.
  const [dragged, setDragged] = useState<MissingSeriesItem | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; after: boolean } | null>(null);
  const endDrag = () => { setDragged(null); setDropTarget(null); };
  const dragProps = (item: MissingSeriesItem) => ({
    onDragStart: (e: DragEvent<HTMLDivElement>) => {
      e.dataTransfer?.setData('text/plain', item._id); // Firefox won't start a drag without data
      e.dataTransfer?.setDragImage(e.currentTarget, 16, 16);
      setDragged(item);
    },
    onDragOver: (e: DragEvent<HTMLDivElement>) => {
      if (!dragged || dragged._id === item._id) return setDropTarget(null);
      if (viewMode === 'grouped' && dragged.publisher !== item.publisher) return;
      e.preventDefault();
      const box = e.currentTarget.getBoundingClientRect();
      const after = e.clientY > box.top + box.height / 2;
      if (dropTarget?.id !== item._id || dropTarget.after !== after) setDropTarget({ id: item._id, after });
    },
    onDrop: (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const id = dragged?._id, target = dropTarget;
      endDrag();
      if (id && target) morphRows('.checklist-body', () => moveSeries(id, target.id, target.after));
    },
    onDragEnd: endDrag,
  });

  const renderRow = (item: MissingSeriesItem, f: MissingLogItem, i: number) => {
    const itemKey = `${item._id}-${f.id}`;
    // A series' drop line sits above its first row or below its last one.
    const edge = dropTarget?.id === item._id && (dropTarget.after ? i === item.formats.length - 1 : i === 0);
    return (
      <MissingVolumeRow
        key={itemKey}
        item={item}
        f={f}
        isChecked={checkedItems.has(itemKey)}
        onToggleCheck={() => toggleCheckItem(itemKey)}
        onEdit={() => setEditingSeries(item.rawSeries)}
        onCopySingle={() => handleCopySingle(item)}
        columns={columns}
        drag={dragProps(item)}
        dropSide={edge ? (dropTarget.after ? 'after' : 'before') : undefined}
        isDragging={dragged?._id === item._id}
      />
    );
  };

  // Copied text carries the same optional columns as the table: series-wide ones in the
  // "( ... )" line, per-log ones (total/owned) after that log's missing volumes.
  const copyText = (item: MissingSeriesItem, indent: string) => {
    const pairs = (perLog: boolean, f: MissingLogItem) => columns
      .filter(c => !!c.perLog === perLog)
      .map(c => [c.label, c.text(item, f)])
      .filter(([, v]) => v)
      .map(([label, v]) => `${label}: ${v}`)
      .join(' | ');
    const details = pairs(false, item.formats[0]);
    let text = details ? `${indent}(${details})\n` : '';
    item.formats.forEach(f => {
      const extra = pairs(true, f);
      text += `${indent}👉 ขาด (${f.title}): เล่ม ${f.missingText}${extra ? ` (${extra})` : ''}\n`;
    });
    return text;
  };

  // Copy items to clipboard (excluding checked ones)
  const handleCopy = async () => {
    const itemsToCopy = filteredList.map(item => {
      const remainingFormats = item.formats.filter(f => !checkedItems.has(`${item._id}-${f.id}`));
      if (remainingFormats.length === 0) return null;
      return { ...item, formats: remainingFormats };
    }).filter((x): x is typeof filteredList[number] => x !== null);

    if (itemsToCopy.length === 0) {
      toast.error("ไม่มีรายการที่ยังไม่เช็กเหลืออยู่ให้คัดลอก");
      return;
    }

    let textToCopy = "📚 เช็กลิสต์หนังสือที่ต้องตามเก็บ\n\n";
    itemsToCopy.forEach((item, index) => {
      textToCopy += `${index + 1}. ${item.title}\n${copyText(item, '   ')}\n`;
    });
    
    // try/catch (not .catch) because navigator.clipboard itself is missing on a non-HTTPS origin
    try {
      await navigator.clipboard.writeText(textToCopy.trim());
      toast.success("คัดลอกรายการที่เหลือลงคลิปบอร์ดแล้ว!");
    } catch {
      toast.error("ไม่สามารถคัดลอกได้");
    }
  };

  const handleCopySingle = async (item: MissingSeriesItem) => {
    const textToCopy = `📚 ${item.title}\n${copyText(item, '')}`;
    
    try {
      await navigator.clipboard.writeText(textToCopy.trim());
      toast.success(`คัดลอก "${item.title}" แล้ว!`);
    } catch {
      toast.error("ไม่สามารถคัดลอกได้");
    }
  };

  return createPortal(
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '1200px', width: '95vw', height: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal__header">
          <h2 className="modal__title" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><Icons.Receipt /> เช็กลิสต์หนังสือที่ยังขาด</h2>
          <button type="button" className="modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="modal__body" style={{ padding: '16px 20px', gap: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}>
          
          {/* Header Controls Bar */}
          <div className="checklist-header-bar">
            {/* Stats Pill */}
            <div className="checklist-stats-bar">
              <div className="checklist-stats-bar__pills">
                <span className="checklist-stats-pill">
                  ขาดทั้งหมด {stats.totalSeries} เรื่อง ({stats.totalVolumes} เล่ม)
                </span>
                {stats.checkedVolumes > 0 && (
                  <span className="checklist-stats-pill checklist-stats-pill--muted">
                    หยิบแล้ว {stats.checkedVolumes} เล่ม ({stats.checkedItemsCount} รายการ)
                  </span>
                )}
                {checkedItems.size > 0 && (
                  <button type="button" className="btn-link" onClick={clearCheckedItems}>
                    ล้างรายการที่หยิบ
                  </button>
                )}
                {(sortBy || hasCustomOrder) && (
                  <button type="button" className="btn-link" onClick={() => morphRows('.checklist-body', resetOrder)}>
                    ล้างการเรียงลำดับ
                  </button>
                )}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                * ติ๊กถูกวงกลมด้านซ้ายเพื่อตัดรายการออกชั่วคราวขณะเลือกซื้อ · ลาก ⋮⋮ เพื่อจัดลำดับเอง —ระบบจะจำไว้แม้ปิดหน้าต่างนี้ไปก่อน
              </span>
            </div>

            {/* Filter controls */}
            <div className="checklist-controls">
              {/* Search Box */}
              <div className="checklist-search-wrapper">
                <span className="checklist-search-icon"><Icons.Search /></span>
                <input 
                  type="text" 
                  className="input checklist-search-input" 
                  placeholder="ค้นหาชื่อเรื่อง / ผู้แต่ง / สนพ..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Publisher Selector */}
              <PublisherDropdown
                selectedPublisher={selectedPublisher}
                onSelectPublisher={pub => setSelectedPublisher([pub].flat())}
                publisherOptions={publisherOptions}
                multiSelect
              />

              <ChecklistColumnPicker visible={visibleColumns} onChange={setVisibleColumns} />

              {/* View Toggle */}
              <div className="checklist-view-toggle">
                <button 
                  type="button"
                  className={`checklist-view-btn ${viewMode === 'grouped' ? 'active' : ''}`}
                  onClick={() => viewMode !== 'grouped' && morphRows('.checklist-body', () => setViewMode('grouped'))}
                  title="แยกกลุ่มตามสำนักพิมพ์"
                >
                  <Icons.Filter /> แยก สนพ.
                </button>
                <button 
                  type="button"
                  className={`checklist-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => viewMode !== 'list' && morphRows('.checklist-body', () => setViewMode('list'))}
                  title="แสดงรายการยาวทั้งหมด"
                >
                  <Icons.List /> รายการยาว
                </button>
              </div>
            </div>
          </div>

          {/* Checklist Main Body */}
          <div className="checklist-body" style={{ '--checklist-cols': checklistGridTemplate(columns) }}>
            {filteredList.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <div className="empty-state__icon">
                  {isFiltering ? "🔍" : "🎉"}
                </div>
                <h3>{isFiltering ? "ไม่พบผลลัพธ์" : "ครบถ้วนสมบูรณ์!"}</h3>
                <p>
                  {isFiltering
                    ? "ไม่พบรายการหนังสือขาดที่ตรงกับเงื่อนไขการค้นหา/ตัวกรอง"
                    : "คุณสะสมครบทุกเล่มทุกเรื่องแล้วครับ สุดยอดเลย!"}
                </p>
              </div>
            ) : (
              <>
                {/* Table Grid Headers */}
                <div className="checklist-table-header">
                  <div className="checklist-header-col"></div>
                  <SortableCol label="ชื่อเรื่อง" sortKey="title" defaultOrder="ASC" sortBy={sortBy} sortOrder={sortOrder} onSortChange={sortRows} />
                  {columns.map(c => c.sortKey ? (
                    <SortableCol key={c.key} label={c.label} sortKey={c.sortKey} defaultOrder={c.defaultOrder ?? 'ASC'} sortBy={sortBy} sortOrder={sortOrder} onSortChange={sortRows} />
                  ) : (
                    <div key={c.key} className="checklist-header-col">{c.label}</div>
                  ))}
                  <SortableCol label="เล่มที่ขาด" sortKey="missing" defaultOrder="DESC" sortBy={sortBy} sortOrder={sortOrder} onSortChange={sortRows} className="list-header-col--right" />
                  <div className="checklist-header-col" style={{ textAlign: 'center' }}>จัดการ</div>
                </div>

                {viewMode === 'grouped' ? (
                  // Grouped view
                  Object.entries(groupedByPublisher).map(([pub, items]) => {
                    const isCollapsed = collapsedPubs.has(pub);
                    
                    // Count remaining active volumes in this group
                    const groupTotalVolumes = items.reduce((sum, item) => 
                      sum + item.formats.reduce((s, f) => s + f.missingCount, 0), 0
                    );
                    
                    return (
                      <div key={pub} className="checklist-publisher-group">
                        <div 
                          className="checklist-publisher-header"
                          onClick={() => toggleCollapsePub(pub)}
                        >
                          <div className="checklist-publisher-title">
                            <span className={`checklist-publisher-chevron ${isCollapsed ? 'collapsed' : ''}`}>
                              <Icons.ChevronDown />
                            </span>
                            <Icons.Book />
                            <span>{pub}</span>
                          </div>
                          <span className="checklist-publisher-count">
                            {items.length} เรื่อง ({groupTotalVolumes} เล่ม)
                          </span>
                        </div>

                        {!isCollapsed && (
                          <div className="checklist-publisher-content">
                            {items.map(item => item.formats.map((f, i) => renderRow(item, f, i)))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  // Flat List view
                  <div className="checklist-publisher-group" style={{ background: 'transparent', border: '1px solid var(--border)' }}>
                    <div className="checklist-publisher-content">
                      {filteredList.map(item => item.formats.map((f, i) => renderRow(item, f, i)))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="modal__footer" style={{ justifyContent: 'space-between', padding: '12px 20px' }}>
          {filteredList.length > 0 ? (
            <button 
              type="button"
              className="btn btn--ghost" 
              onClick={handleCopy} 
              style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}
            >
              <Icons.Copy /> คัดลอกข้อความ ({stats.totalVolumes - stats.checkedVolumes} เล่มที่เหลือ)
            </button>
          ) : <div />}
          <button type="button" className="btn btn--primary" onClick={onClose}>ปิดเช็กลิสต์</button>
        </div>
      </div>

      {/* Overlay Series Info Modal for Quick Editing */}
      {editingSeries && (
        <SeriesInfoModal 
          series={editingSeries} 
          onClose={() => closeModal(() => setEditingSeries(null))} 
        />
      )}
    </div>, document.body
  );
}

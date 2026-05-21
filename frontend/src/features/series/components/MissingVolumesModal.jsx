import React, { useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { Icons } from "../../../components/Icons";
import '../Series.css';
import { SeriesInfoModal } from "./SeriesInfoModal";

// Sub-components & hooks
import { useMissingVolumes } from "../hooks/useMissingVolumes";
import { MissingVolumeRow } from "./MissingVolumeRow";

export function MissingVolumesModal({ onClose }) {
  const [editingSeries, setEditingSeries] = useState(null);

  const {
    searchQuery,
    setSearchQuery,
    selectedPublisher,
    setSelectedPublisher,
    viewMode,
    setViewMode,
    checkedItems,
    toggleCheckItem,
    collapsedPubs,
    toggleCollapsePub,
    filteredList,
    publisherOptions,
    groupedByPublisher,
    stats
  } = useMissingVolumes();

  // Copy items to clipboard (excluding checked ones)
  const handleCopy = () => {
    const itemsToCopy = filteredList.map(item => {
      const remainingFormats = item.formats.filter(f => !checkedItems.has(`${item._id}-${f.id}`));
      if (remainingFormats.length === 0) return null;
      return { ...item, formats: remainingFormats };
    }).filter(Boolean);

    if (itemsToCopy.length === 0) {
      return toast.error("ไม่มีรายการที่ยังไม่เช็กเหลืออยู่ให้คัดลอก");
    }

    let textToCopy = "📚 เช็กลิสต์หนังสือที่ต้องตามเก็บ\n\n";
    itemsToCopy.forEach((item, index) => {
      textToCopy += `${index + 1}. ${item.title}\n`;
      const details = [];
      if (item.author) details.push(`แต่ง: ${item.author}`);
      if (item.publisher) details.push(`สนพ: ${item.publisher}`);
      if (details.length > 0) textToCopy += `   (${details.join(' | ')})\n`;
      item.formats.forEach(f => { textToCopy += `   👉 ขาด (${f.title}): เล่ม ${f.missingText}\n`; });
      textToCopy += "\n";
    });
    
    navigator.clipboard.writeText(textToCopy.trim())
      .then(() => toast.success("คัดลอกรายการที่เหลือลงคลิปบอร์ดแล้ว!"))
      .catch(() => toast.error("ไม่สามารถคัดลอกได้"));
  };

  const handleCopySingle = (item) => {
    let textToCopy = `📚 ${item.title}\n`;
    const details = [];
    if (item.author) details.push(`แต่ง: ${item.author}`);
    if (item.publisher) details.push(`สนพ: ${item.publisher}`);
    if (details.length > 0) textToCopy += `(${details.join(' | ')})\n`;
    item.formats.forEach(f => { textToCopy += `👉 ขาด (${f.title}): เล่ม ${f.missingText}\n`; });
    
    navigator.clipboard.writeText(textToCopy.trim())
      .then(() => toast.success(`คัดลอก "${item.title}" แล้ว!`))
      .catch(() => toast.error("ไม่สามารถคัดลอกได้"));
  };

  return createPortal(
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '1200px', width: '95vw', height: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal__header">
          <h2 className="modal__title" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><Icons.Receipt /> เช็กลิสต์หนังสือที่ยังขาด</h2>
          <button className="modal__close" onClick={onClose}>✕</button>
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
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                * ติ๊กถูกวงกลมด้านซ้ายเพื่อตัดรายการออกชั่วคราวขณะเลือกซื้อ
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
              <select 
                className="checklist-select-filter"
                value={selectedPublisher}
                onChange={(e) => setSelectedPublisher(e.target.value)}
              >
                <option value="all">ทุกสำนักพิมพ์</option>
                {publisherOptions.map((pub, i) => (
                  <option key={i} value={pub}>{pub}</option>
                ))}
              </select>

              {/* View Toggle */}
              <div className="checklist-view-toggle">
                <button 
                  className={`checklist-view-btn ${viewMode === 'grouped' ? 'active' : ''}`}
                  onClick={() => setViewMode('grouped')}
                  title="แยกกลุ่มตามสำนักพิมพ์"
                >
                  <Icons.Filter /> แยก สนพ.
                </button>
                <button 
                  className={`checklist-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="แสดงรายการยาวทั้งหมด"
                >
                  <Icons.List /> รายการยาว
                </button>
              </div>
            </div>
          </div>

          {/* Checklist Main Body */}
          <div className="checklist-body">
            {filteredList.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <div className="empty-state__icon">
                  {searchQuery || selectedPublisher !== "all" ? "🔍" : "🎉"}
                </div>
                <h3>{searchQuery || selectedPublisher !== "all" ? "ไม่พบผลลัพธ์" : "ครบถ้วนสมบูรณ์!"}</h3>
                <p>
                  {searchQuery || selectedPublisher !== "all"
                    ? "ไม่พบรายการหนังสือขาดที่ตรงกับเงื่อนไขการค้นหา/ตัวกรอง"
                    : "คุณสะสมครบทุกเล่มทุกเรื่องแล้วครับ สุดยอดเลย!"}
                </p>
              </div>
            ) : (
              <>
                {/* Table Grid Headers */}
                <div className="checklist-table-header">
                  <div className="checklist-header-col"></div>
                  <div className="checklist-header-col">ชื่อเรื่อง</div>
                  <div className="checklist-header-col">ผู้แต่ง</div>
                  <div className="checklist-header-col">สำนักพิมพ์</div>
                  <div className="checklist-header-col" style={{ textAlign: 'right', paddingRight: '8px' }}>เล่มที่ขาด</div>
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
                            <span style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.15s', fontSize: '0.7rem' }}>
                              ▼
                            </span>
                            {pub}
                          </div>
                          <span className="checklist-publisher-count">
                            {items.length} เรื่อง ({groupTotalVolumes} เล่ม)
                          </span>
                        </div>

                        {!isCollapsed && (
                          <div className="checklist-publisher-content">
                            {items.map(item => 
                              item.formats.map(f => {
                                const itemKey = `${item._id}-${f.id}`;
                                return (
                                  <MissingVolumeRow
                                    key={itemKey}
                                    item={item}
                                    f={f}
                                    isChecked={checkedItems.has(itemKey)}
                                    onToggleCheck={() => toggleCheckItem(itemKey)}
                                    onEdit={() => setEditingSeries(item.rawSeries)}
                                    onCopySingle={() => handleCopySingle(item)}
                                  />
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  // Flat List view
                  <div className="checklist-publisher-group" style={{ background: 'transparent', border: '1px solid var(--border)' }}>
                    <div className="checklist-publisher-content">
                      {filteredList.map(item => 
                        item.formats.map(f => {
                          const itemKey = `${item._id}-${f.id}`;
                          return (
                            <MissingVolumeRow
                              key={itemKey}
                              item={item}
                              f={f}
                              isChecked={checkedItems.has(itemKey)}
                              onToggleCheck={() => toggleCheckItem(itemKey)}
                              onEdit={() => setEditingSeries(item.rawSeries)}
                              onCopySingle={() => handleCopySingle(item)}
                            />
                          );
                        })
                      )}
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
              className="btn btn--ghost" 
              onClick={handleCopy} 
              style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}
            >
              <Icons.Copy /> คัดลอกข้อความ ({stats.totalVolumes - stats.checkedVolumes} เล่มที่เหลือ)
            </button>
          ) : <div />}
          <button className="btn btn--primary" onClick={onClose}>ปิดเช็กลิสต์</button>
        </div>
      </div>

      {/* Overlay Series Info Modal for Quick Editing */}
      {editingSeries && (
        <SeriesInfoModal 
          series={editingSeries} 
          onClose={() => setEditingSeries(null)} 
        />
      )}
    </div>, document.body
  );
}

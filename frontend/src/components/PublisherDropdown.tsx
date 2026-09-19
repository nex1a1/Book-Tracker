import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from './Icons';
import './PublisherDropdown.css';

export interface PublisherDropdownProps {
  selectedPublisher: string | string[];
  onSelectPublisher: (pub: any) => void;
  publisherOptions: string[];
  placeholder?: string;
  fullWidth?: boolean;
  multiSelect?: boolean;
}

export function PublisherDropdown({
  selectedPublisher,
  onSelectPublisher,
  publisherOptions,
  fullWidth = false,
  multiSelect = false,
}: PublisherDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [menuPos, setMenuPos] = useState<{
    top: number | 'auto';
    bottom: number | 'auto';
    left: number;
    width: number;
    maxHeight: number;
    dropUp: boolean;
  } | null>(null);

  // Normalize selected publishers into an array
  const selectedValues = useMemo<string[]>(() => {
    if (Array.isArray(selectedPublisher)) {
      return selectedPublisher;
    }
    if (selectedPublisher && selectedPublisher !== 'all') {
      return [selectedPublisher];
    }
    return [];
  }, [selectedPublisher]);

  const isFiltered = selectedValues.length > 0;

  // Trigger button label
  const displayLabel = useMemo(() => {
    if (selectedValues.length === 0) return 'ทุกสำนักพิมพ์';
    if (selectedValues.length === 1) return selectedValues[0];
    return `${selectedValues.length} สำนักพิมพ์`;
  }, [selectedValues]);

  // Calculate menu position
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const dropUp = spaceBelow < 260 && spaceAbove > spaceBelow;
    const availableHeight = dropUp ? spaceAbove - 16 : spaceBelow - 16;
    const maxHeight = Math.max(180, Math.min(availableHeight, 360));
    const width = fullWidth ? rect.width : Math.max(rect.width, 220);

    return {
      top: dropUp ? ('auto' as const) : rect.bottom + 6,
      bottom: dropUp ? window.innerHeight - rect.top + 6 : ('auto' as const),
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      width,
      maxHeight,
      dropUp,
    };
  }, [fullWidth]);

  const toggleOpen = () => {
    if (!isOpen) {
      const pos = calculatePosition();
      if (pos) setMenuPos(pos);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const handleScrollOrResize = () => {
        const pos = calculatePosition();
        if (pos) setMenuPos(pos);
      };

      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node;
        if (
          triggerRef.current && !triggerRef.current.contains(target) &&
          menuRef.current && !menuRef.current.contains(target)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [isOpen, calculatePosition]);

  // Reset search filter when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchFilter('');
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!searchFilter.trim()) return publisherOptions;
    const q = searchFilter.toLowerCase();
    return publisherOptions.filter(p => p.toLowerCase().includes(q));
  }, [publisherOptions, searchFilter]);

  // Handlers for single vs multi-select
  const handleSelect = (pub: string) => {
    if (multiSelect) {
      if (selectedValues.includes(pub)) {
        onSelectPublisher(selectedValues.filter(p => p !== pub));
      } else {
        onSelectPublisher([...selectedValues, pub]);
      }
    } else {
      onSelectPublisher(pub);
      setIsOpen(false);
    }
  };

  const handleSelectAll = () => {
    if (multiSelect) {
      onSelectPublisher([...publisherOptions]);
    }
  };

  const handleClear = () => {
    if (multiSelect) {
      onSelectPublisher([]);
    } else {
      onSelectPublisher('all');
    }
  };

  return (
    <div className={`publisher-dropdown-container ${fullWidth ? 'full-width' : ''}`}>
      <button
        ref={triggerRef}
        type="button"
        className={`publisher-dropdown-trigger ${isFiltered ? 'active' : ''} ${fullWidth ? 'full-width' : ''}`}
        onClick={toggleOpen}
        title={isFiltered ? selectedValues.join(', ') : 'เลือกสำนักพิมพ์'}
      >
        <span className="publisher-dropdown-trigger__icon">
          <Icons.Book />
        </span>
        <span className="publisher-dropdown-trigger__label">
          {displayLabel}
        </span>
        {multiSelect && isFiltered && (
          <span className="publisher-count-badge">
            {selectedValues.length}
          </span>
        )}
        {isFiltered && (
          <span
            className="publisher-dropdown-clear"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            title="ล้างการเลือกสำนักพิมพ์"
          >
            <Icons.X />
          </span>
        )}
        <span className={`publisher-dropdown-trigger__chevron ${isOpen ? 'open' : ''}`}>
          <Icons.ChevronDown />
        </span>
      </button>

      {isOpen && menuPos && createPortal(
        <div
          ref={menuRef}
          className={`publisher-dropdown-menu ${menuPos.dropUp ? 'drop-up' : ''}`}
          style={{
            position: 'fixed',
            top: menuPos.top,
            bottom: menuPos.bottom,
            left: menuPos.left,
            width: menuPos.width,
            maxHeight: menuPos.maxHeight,
            zIndex: 99999,
          }}
        >
          {publisherOptions.length > 5 && (
            <div className="publisher-dropdown-search">
              <Icons.Search />
              <input
                type="text"
                className="publisher-dropdown-search-input"
                placeholder="ค้นหาสำนักพิมพ์..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                autoFocus
                onClick={e => e.stopPropagation()}
              />
              {searchFilter && (
                <button
                  type="button"
                  className="publisher-dropdown-search-clear"
                  onClick={() => setSearchFilter('')}
                >
                  <Icons.X />
                </button>
              )}
            </div>
          )}

          {multiSelect && (
            <div className="publisher-dropdown-actions">
              <button
                type="button"
                className="publisher-dropdown-action-btn"
                onClick={handleSelectAll}
              >
                เลือกทั้งหมด ({publisherOptions.length})
              </button>
              <button
                type="button"
                className="publisher-dropdown-action-btn muted"
                onClick={handleClear}
              >
                ล้างทั้งหมด
              </button>
            </div>
          )}

          <div
            className="publisher-dropdown-list"
            style={{
              maxHeight: menuPos.maxHeight - (publisherOptions.length > 5 ? 46 : 0) - (multiSelect ? 74 : 0),
            }}
          >
            {!multiSelect && (
              <button
                type="button"
                className={`publisher-dropdown-item ${!isFiltered ? 'active' : ''}`}
                onClick={() => {
                  onSelectPublisher('all');
                  setIsOpen(false);
                }}
              >
                <div className="publisher-dropdown-item__content">
                  <Icons.Book />
                  <span>ทุกสำนักพิมพ์</span>
                </div>
                {!isFiltered && (
                  <span className="publisher-dropdown-item__check">
                    <Icons.CheckCircle />
                  </span>
                )}
              </button>
            )}

            {filteredOptions.length === 0 ? (
              <div className="publisher-dropdown-empty">
                ไม่พบสำนักพิมพ์ "{searchFilter}"
              </div>
            ) : (
              filteredOptions.map((pub) => {
                const isSelected = selectedValues.includes(pub);
                return (
                  <button
                    key={pub}
                    type="button"
                    className={`publisher-dropdown-item ${isSelected ? 'active' : ''}`}
                    onClick={() => handleSelect(pub)}
                  >
                    <div className="publisher-dropdown-item__content">
                      {multiSelect ? (
                        <div className="publisher-checkbox">
                          {isSelected && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          )}
                        </div>
                      ) : (
                        <Icons.Book />
                      )}
                      <span>{pub}</span>
                    </div>
                    {!multiSelect && isSelected && (
                      <span className="publisher-dropdown-item__check">
                        <Icons.CheckCircle />
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {multiSelect && (
            <div className="publisher-dropdown-footer">
              <span>
                {selectedValues.length === 0
                  ? 'ทุกสำนักพิมพ์'
                  : `เลือกแล้ว ${selectedValues.length}/${publisherOptions.length}`}
              </span>
              <button
                type="button"
                className="publisher-dropdown-done-btn"
                onClick={() => setIsOpen(false)}
              >
                ตกลง
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

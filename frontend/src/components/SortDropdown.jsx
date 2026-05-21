import React, { useState, useEffect, useRef } from "react";
import { Icons } from "./Icons";
import "./SortDropdown.css";

const ClockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const BookIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
  </svg>
);

const CalendarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const StarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);

const PlusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="16"></line>
    <line x1="8" y1="12" x2="16" y2="12"></line>
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const SORT_OPTIONS = [
  { value: "updatedAt", label: "อัปเดตล่าสุด", icon: ClockIcon },
  { value: "title", label: "ชื่อเรื่อง A–Z", icon: BookIcon },
  { value: "publishYear", label: "ปีที่พิมพ์", icon: CalendarIcon },
  { value: "rating", label: "คะแนนรีวิว", icon: StarIcon },
  { value: "createdAt", label: "วันที่เพิ่มระบบ", icon: PlusIcon },
];

export function SortDropdown({ sortBy, sortOrder, onSortByChange, onSortOrderToggle }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const activeOption = SORT_OPTIONS.find((opt) => opt.value === sortBy) || SORT_OPTIONS[0];
  const ActiveIcon = activeOption.icon;

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (val) => {
    onSortByChange(val);
    setIsOpen(false);
  };

  return (
    <div className={`sort-widget ${isOpen ? "sort-widget--open" : ""}`} ref={containerRef}>
      {/* 🔸 Main trigger button */}
      <button 
        className="sort-dropdown-trigger" 
        onClick={() => setIsOpen(!isOpen)}
        title="เลือกรูปแบบการเรียงลำดับ"
      >
        <span className="sort-dropdown-trigger__icon">
          <ActiveIcon />
        </span>
        <span className="sort-dropdown-trigger__label">
          เรียงตาม: <strong style={{ color: "#ffffff", marginLeft: "2px" }}>{activeOption.label}</strong>
        </span>
        <span className="sort-dropdown-trigger__chevron">
          <Icons.ChevronDown />
        </span>
      </button>

      {/* 🔸 Separator Line */}
      <div className="sort-divider" />

      {/* 🔸 Order direction toggle button */}
      <button
        className="sort-direction-btn"
        title={sortOrder === "DESC" ? "จากมากไปน้อย (ลงท้ายก่อน)" : "จากน้อยไปมาก (ขึ้นต้นก่อน)"}
        onClick={onSortOrderToggle}
      >
        {sortOrder === "DESC" ? <Icons.SortDesc /> : <Icons.SortAsc />}
      </button>

      {/* 🔸 Dropdown menu container */}
      <div className={`sort-dropdown-menu ${isOpen ? "sort-dropdown-menu--open" : ""}`}>
        {SORT_OPTIONS.map((opt) => {
          const ItemIcon = opt.icon;
          const isActive = opt.value === sortBy;
          return (
            <button
              key={opt.value}
              className={`sort-dropdown-item ${isActive ? "sort-dropdown-item--active" : ""}`}
              onClick={() => handleSelect(opt.value)}
            >
              <div className="sort-dropdown-item__content">
                <span className="sort-dropdown-item__icon">
                  <ItemIcon />
                </span>
                <span>{opt.label}</span>
              </div>
              {isActive && (
                <span className="sort-dropdown-item__checkmark">
                  <CheckIcon />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

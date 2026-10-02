import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Icons } from "./Icons";
import "./Dropdown.css";

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
}

// Themed replacement for a native <select> — the OS-rendered option list is the one
// piece of the form that couldn't be reached by CSS, so this reimplements it in-theme.
// The menu is portaled with fixed positioning (same approach as PublisherDropdown) so the
// modal's overflow-y:auto form area can't clip it, and it flips upward when space below is short.
export function Dropdown({ value, options, onChange, id, disabled }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number | "auto"; bottom: number | "auto"; left: number; width: number; dropUp: boolean } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectedIndex = Math.max(0, options.findIndex(o => o.value === value));
  const selected = options[selectedIndex];

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const menuHeight = Math.min(260, options.length * 36 + 12);
    const dropUp = spaceBelow < menuHeight + 12 && spaceAbove > spaceBelow;
    return {
      top: dropUp ? ("auto" as const) : rect.bottom + 6,
      bottom: dropUp ? window.innerHeight - rect.top + 6 : ("auto" as const),
      left: rect.left,
      width: rect.width,
      dropUp,
    };
  }, [options.length]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fixed positioning doesn't follow the trigger, so re-measure when anything scrolls or resizes.
  useEffect(() => {
    if (!isOpen) return;
    const reposition = () => {
      const pos = calculatePosition();
      if (pos) setMenuPos(pos);
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [isOpen, calculatePosition]);

  const openMenu = (focusIndex?: number) => {
    if (disabled) return;
    const pos = calculatePosition();
    if (pos) setMenuPos(pos);
    setIsOpen(true);
    const idx = focusIndex ?? selectedIndex;
    requestAnimationFrame(() => itemRefs.current[idx]?.focus());
  };

  const closeMenu = (focusTrigger = true) => {
    setIsOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  };

  const selectOption = (opt: DropdownOption) => {
    onChange(opt.value);
    closeMenu();
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (isOpen && e.key === "Escape") {
      // Covers the case where focus never made it from the trigger to a menu item
      // (e.g. the menu-open re-render hasn't landed yet when this fires).
      e.preventDefault();
      e.stopPropagation();
      closeMenu(false);
    } else if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      openMenu();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      openMenu(options.length - 1);
    }
  };

  const handleItemKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      const next = Math.min(idx + 1, options.length - 1);
      itemRefs.current[next]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      const prev = Math.max(idx - 1, 0);
      itemRefs.current[prev]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeMenu();
    } else if (e.key === "Enter" || e.key === " ") {
      // No explicit handling needed: the item is a real <button>, so the browser's
      // native activation already fires onClick. Just stop it reaching the modal's listener.
      e.stopPropagation();
    } else if (e.key === "Tab") {
      setIsOpen(false);
    }
  };

  return (
    <div className={`dropdown ${isOpen ? "dropdown--open" : ""}`} ref={containerRef}>
      <button
        id={id}
        ref={triggerRef}
        type="button"
        className="dropdown-trigger"
        onClick={() => (isOpen ? closeMenu(false) : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="dropdown-trigger__label">{selected?.label}</span>
        <span className="dropdown-trigger__chevron"><Icons.ChevronDown /></span>
      </button>

      {isOpen && menuPos && createPortal(
        <div
          ref={menuRef}
          className={`dropdown-menu dropdown-menu--open dropdown-menu--fixed ${menuPos.dropUp ? "dropdown-menu--up" : ""}`}
          role="listbox"
          style={{ top: menuPos.top, bottom: menuPos.bottom, left: menuPos.left, width: menuPos.width }}
        >
          {options.map((opt, idx) => {
            const isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                ref={el => { itemRefs.current[idx] = el; }}
                type="button"
                role="option"
                aria-selected={isActive}
                tabIndex={-1}
                className={`dropdown-item ${isActive ? "dropdown-item--active" : ""}`}
                onClick={() => selectOption(opt)}
                onKeyDown={(e) => handleItemKeyDown(e, idx)}
              >
                <span>{opt.label}</span>
                {isActive && <span className="dropdown-item__checkmark"><CheckIcon /></span>}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

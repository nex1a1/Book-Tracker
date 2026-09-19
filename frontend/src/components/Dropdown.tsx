import React, { useState, useRef, useEffect } from "react";
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
export function Dropdown({ value, options, onChange, id, disabled }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectedIndex = Math.max(0, options.findIndex(o => o.value === value));
  const selected = options[selectedIndex];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openMenu = (focusIndex?: number) => {
    if (disabled) return;
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

      <div className={`dropdown-menu ${isOpen ? "dropdown-menu--open" : ""}`} role="listbox">
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
      </div>
    </div>
  );
}

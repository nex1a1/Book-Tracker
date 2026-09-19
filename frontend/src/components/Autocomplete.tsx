import React, { useState, useRef, useEffect } from "react";
import "./Dropdown.css";

interface AutocompleteProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

// Themed replacement for <input list="..."> + <datalist> — the native datalist popup
// can't be styled by CSS at all in any browser, so this reimplements it in-theme.
// Unlike Dropdown, the value isn't restricted to the option list: it's still free text.
export function Autocomplete({ value, onChange, options, className, onFocus, id, ...rest }: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reactId = React.useId();
  const listboxId = `${id || reactId}-listbox`;

  const filtered = value.trim() === ""
    ? options.slice(0, 8)
    : options.filter(o => o.toLowerCase().includes(value.toLowerCase())).slice(0, 8);

  const showMenu = isOpen && filtered.length > 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setActiveIdx(-1);
  }, [value, isOpen]);

  const selectOption = (opt: string) => {
    onChange(opt);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) { setIsOpen(true); return; }
      setActiveIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (isOpen && activeIdx >= 0 && filtered[activeIdx]) {
        e.preventDefault();
        selectOption(filtered[activeIdx]);
      }
    } else if (e.key === "Escape") {
      if (isOpen) {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);
      }
    }
  };

  return (
    <div className="dropdown" ref={containerRef}>
      <input
        {...rest}
        id={id}
        ref={inputRef}
        className={`input ${className || ""}`}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={e => { setIsOpen(true); onFocus?.(e); }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        role="combobox"
        aria-expanded={showMenu}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-activedescendant={activeIdx >= 0 ? `${listboxId}-option-${activeIdx}` : undefined}
      />
      {showMenu && (
        <div id={listboxId} className="dropdown-menu dropdown-menu--open" role="listbox">
          {filtered.map((opt, idx) => (
            <button
              key={opt}
              id={`${listboxId}-option-${idx}`}
              type="button"
              role="option"
              aria-selected={idx === activeIdx}
              tabIndex={-1}
              className={`dropdown-item ${idx === activeIdx ? "dropdown-item--active" : ""}`}
              onClick={() => selectOption(opt)}
            >
              <span>{opt}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

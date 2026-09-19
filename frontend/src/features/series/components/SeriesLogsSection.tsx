import React from "react";
import { Icons } from "../../../components/Icons";
import { BookLog } from "../../../types";
import { LogEditorBox } from "./LogEditorBox";

interface SeriesLogsSectionProps {
  type: "reading" | "collection";
  logs: BookLog[];
  isOpen: boolean;
  onToggleOpen: () => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onUpdate: (idx: number, field: keyof BookLog, val: BookLog[keyof BookLog]) => void;
  compactTitle?: boolean;
}

export function SeriesLogsSection({ type, logs, isOpen, onToggleOpen, onAdd, onRemove, onUpdate, compactTitle }: SeriesLogsSectionProps) {
  const isReading = type === "reading";

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
        <h3
          className="form-section-card__title"
          style={{ border: 'none', padding: 0, margin: 0, fontSize: compactTitle ? '0.88rem' : undefined }}
        >
          <button
            type="button"
            className="form-section-card__title-toggle"
            onClick={onToggleOpen}
            aria-expanded={isOpen}
          >
            <span style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', display: 'inline-block', transition: 'transform 0.15s', fontSize: '0.7rem' }}>▼</span>
            {isReading ? <Icons.Book /> : <Icons.Cart />}
            {isReading ? " บันทึกความคืบหน้าการอ่าน" : " รูปแบบรูปเล่มสะสม (Physical / E-Book)"}
            {!isOpen && <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: '0.75rem' }}> ({logs.length} {isReading ? "ชุด" : "รูปแบบ"})</span>}
          </button>
        </h3>
        <button
          type="button"
          className="btn btn--sm btn--ghost"
          style={{ borderColor: 'rgba(255,123,0,0.4)', color: 'var(--accent)' }}
          onClick={onAdd}
        >
          {isReading ? "+ เพิ่มชุด/ภาคใหม่" : "+ เพิ่มรูปแบบสะสม"}
        </button>
      </div>

      {isOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {logs.map((log, idx) => (
            <LogEditorBox
              key={log.id}
              log={log}
              idx={idx}
              type={type}
              showRemove={logs.length > 1}
              onRemove={() => onRemove(idx)}
              onUpdate={(field, val) => onUpdate(idx, field, val)}
            />
          ))}
        </div>
      )}
    </>
  );
}

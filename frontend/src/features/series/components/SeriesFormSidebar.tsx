import React from "react";
import { Icons } from "../../../components/Icons";
import { BookLog, SeriesDerivedStats } from "../../../types";
import { MalSearchPanel, MalItem } from "./MalSearchPanel";
import { LiveCardPreview } from "./LiveCardPreview";

interface SeriesFormSidebarProps {
  form: {
    title: string;
    imageUrl: string;
    notes: string;
    type: string;
    status: string;
    publishYear: number | string | null;
    endYear: number | string | null;
    author: string;
    publisher: string;
    rating: number;
    readingLogs: BookLog[];
    collectionLogs: BookLog[];
    isCollecting: boolean;
    isCollectingStopped?: boolean;
  };
  stats: SeriesDerivedStats;
  malOpen: boolean;
  onToggleMal: () => void;
  onSelectMalItem: (m: MalItem) => void;
  onNotesChange: (notes: string) => void;
}

export function SeriesFormSidebar({ form, stats, malOpen, onToggleMal, onSelectMalItem, onNotesChange }: SeriesFormSidebarProps) {
  return (
    <div className="modal__sidebar">
      <LiveCardPreview form={form} stats={stats} />

      <div>
        <button
          type="button"
          className="checklist-publisher-header"
          onClick={onToggleMal}
          aria-expanded={malOpen}
        >
          <div className="checklist-publisher-title" style={{ fontSize: '0.8rem' }}>
            <span style={{ transform: malOpen ? 'rotate(0deg)' : 'rotate(-90deg)', display: 'inline-block', transition: 'transform 0.15s', fontSize: '0.7rem' }}>▼</span>
            <Icons.Search /> ค้นหาจาก MyAnimeList (ดึงข้อมูลอัตโนมัติ)
          </div>
        </button>
        {malOpen && (
          <MalSearchPanel
            title={form.title}
            imageUrl={form.imageUrl}
            onSelectMalItem={onSelectMalItem}
          />
        )}
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        <span className="sidebar-mal-title">บันทึกช่วยจำ / ข้อมูลเพิ่มเติม</span>
        <textarea
          className="textarea"
          value={form.notes}
          onChange={e => onNotesChange(e.target.value)}
          placeholder="คำวิจารณ์ย่อๆ, ชั้นที่เก็บหนังสือ, หรือบันทึกความทรงจำอื่นๆ..."
          style={{ flex: 1, minHeight: '100px' }}
        />
      </label>
    </div>
  );
}

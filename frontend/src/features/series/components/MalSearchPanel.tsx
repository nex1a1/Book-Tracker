import React, { useState } from "react";
import toast from "react-hot-toast";
import { Icons } from "../../../components/Icons";

export interface MalItemNode {
  id: number;
  title: string;
  main_picture?: {
    medium?: string;
    large?: string;
  };
  status?: string;
  num_volumes?: number;
  start_date?: string;
  authors?: {
    node: {
      id: number;
      first_name: string;
      last_name: string;
    };
    role: string;
  }[];
}

export interface MalItem {
  node: MalItemNode;
}

interface MalSearchPanelProps {
  title: string;
  imageUrl: string;
  onSelectMalItem: (item: MalItem) => void;
}

export function MalSearchPanel({ title, imageUrl, onSelectMalItem }: MalSearchPanelProps) {
  const [malResults, setMalResults] = useState<MalItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchMAL = async () => {
    if (!title || title.trim() === "") {
      toast.error("กรุณากรอกชื่อเรื่องก่อนค้นหา");
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/mal/search?q=${encodeURIComponent(title)}`);
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        setMalResults(data.data);
        toast.success(`พบข้อมูล ${data.data.length} เรื่องใน MAL!`);
      } else {
        toast.error("ไม่พบข้อมูลเรื่องนี้ในระบบ MAL");
        setMalResults([]);
      }
    } catch (err) { 
      toast.error("เกิดข้อผิดพลาดในการดึงข้อมูล"); 
    } finally { 
      setIsSearching(false); 
    }
  };

  return (
    <div className="sidebar-mal-panel">
      <span className="sidebar-mal-title">ค้นปกและข้อมูลจาก MAL</span>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button 
          type="button"
          className="btn btn--primary" 
          onClick={searchMAL} 
          disabled={isSearching} 
          style={{ width: '100%', justifyContent: 'center', height: '32px', fontSize: '0.75rem' }}
        >
          {isSearching ? "กำลังดึงข้อมูล..." : "🔍 ดึงข้อมูลอัตโนมัติ"}
        </button>
      </div>
      
      {malResults.length > 0 && (
        <div className="sidebar-mal-list">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px 4px 2px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.62rem', color: 'var(--muted)', fontWeight: 600 }}>คลิกเลือกปกด้านล่าง:</span>
            <button 
              type="button"
              className="btn-icon" 
              onClick={() => setMalResults([])} 
              style={{ width: '18px', height: '18px' }} 
              title="ปิดกล่องค้นหา"
            >
              <Icons.X />
            </button>
          </div>
          {malResults.map(m => {
            const coverUrl = m.node.main_picture?.large || m.node.main_picture?.medium || "";
            const isSelected = imageUrl === coverUrl;
            return (
              <div 
                key={m.node.id} 
                className={`sidebar-mal-item ${isSelected ? 'is-selected' : ''}`}
                onClick={() => onSelectMalItem(m)}
              >
                <img src={m.node.main_picture?.medium || ""} alt="" className="sidebar-mal-thumb" />
                <div className="sidebar-mal-info">
                  <p className="sidebar-mal-item-title" title={m.node.title}>{m.node.title}</p>
                  <p className="sidebar-mal-item-sub">
                    {m.node.status === 'finished' ? 'จบแล้ว' : 'กำลังลง'}
                    {m.node.num_volumes ? ` • ${m.node.num_volumes} เล่ม` : ''}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

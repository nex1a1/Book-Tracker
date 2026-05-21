import React from "react";
import { Icons } from "../../../components/Icons";

export function MissingVolumeRow({ item, f, isChecked, onToggleCheck, onEdit, onCopySingle }) {
  return (
    <div className={`checklist-item-row ${isChecked ? "is-checked" : ""}`}>
      <div className="checklist-item-checkbox-wrapper">
        <div 
          className="checklist-custom-checkbox" 
          onClick={onToggleCheck}
          title={isChecked ? "ยกเลิกการเลือก" : "ทำเครื่องหมายว่าหยิบแล้ว"}
        >
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 4L4 7L9 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      <div className="checklist-item-title-col">
        <h4 className="checklist-item-title" title={item.title}>{item.title}</h4>
        <span className={`badge checklist-item-badge badge--${item.rawType}`}>{item.typeStr}</span>
      </div>

      <div className="checklist-item-author-col" title={item.author || "ไม่ระบุ"}>
        {item.author || <span className="checklist-empty-field">-</span>}
      </div>

      <div className="checklist-item-publisher-col" title={item.publisher}>
        {item.publisher && item.publisher !== "ไม่ระบุสำนักพิมพ์" ? (
          item.publisher
        ) : (
          <span className="checklist-empty-field">-</span>
        )}
      </div>

      <div className="checklist-item-missing-col">
        {f.title && f.title !== "เล่มปกติ" && (
          <span className="checklist-item-format">{f.title}</span>
        )}
        <span className="checklist-item-missing-volumes">เล่ม {f.missingText}</span>
      </div>

      <div className="checklist-item-actions">
        <button 
          className="checklist-row-btn checklist-row-btn--edit" 
          onClick={onEdit}
          title="แก้ไขรายละเอียดเรื่องนี้"
        >
          <Icons.Edit />
        </button>
        <button 
          className="checklist-row-btn checklist-row-btn--copy" 
          onClick={onCopySingle}
          title="คัดลอกข้อมูลเรื่องนี้"
        >
          <Icons.Copy />
        </button>
      </div>
    </div>
  );
}

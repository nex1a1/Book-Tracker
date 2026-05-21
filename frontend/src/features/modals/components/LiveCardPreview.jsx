import React from "react";
import { Icons } from "../../../components/Icons";
import { StarRating, AggregatedVolumeBar } from "../../../components/SharedUI";
import { getMissingVolumesText, FORMAT_LABEL, TYPE_LABEL, STATUS_LABEL } from "../../../utils";

export function LiveCardPreview({ form, stats }) {
  return (
    <div className="live-preview-section">
      <div className="live-preview-header">
        <h4 className="live-preview-title">
          <span className="pulse-dot"></span> Live Card Preview
        </h4>
        <span style={{ fontSize: '0.62rem', color: 'var(--muted)', fontWeight: 600 }}>ตัวอย่างแสดงผล</span>
      </div>
      
      <div className="live-preview-card-wrap">
        <div className="card" style={{ margin: 0, border: '1px solid rgba(255, 123, 0, 0.25)', boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}>
          <div className="card__top">
            {form.imageUrl ? (
              <img src={form.imageUrl} alt={form.title} className="card__cover" />
            ) : (
              <div className="card__cover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '0.7rem', background: 'var(--cream)' }}>ไม่มีรูปปก</div>
            )}
            
            <div className="card__info">
              <div className="card__header">
                <div className="card__badges">
                  <span className={`badge badge--${form.type}`}>{TYPE_LABEL[form.type]}</span>
                  <span className={`badge badge--${form.status}`}>{STATUS_LABEL[form.status]}</span>
                </div>
              </div>
              
              <h3 className="card__title" title={form.title || "ชื่อเรื่อง"}>{form.title || "ชื่อเรื่องที่พิมพ์..."}</h3>
              <span className="card__timeline-label">
                {form.publishYear || "?"} – {(form.status === 'completed' || form.endYear) ? (form.endYear || "จบแล้ว") : "ปัจจุบัน"}
              </span>
              <p className="card__author" title={`${form.author || "?"} | ${form.publisher || ""}`}>
                {form.author || "ผู้แต่ง"} {form.publisher ? `| ${form.publisher}` : ""}
              </p>
              
              <div style={{ marginTop: 'auto' }}>
                <StarRating rating={form.rating || 0} size="sm" readOnly />
              </div>
            </div>
          </div>
          
          <div className="volume-progress" style={{ padding: '8px 12px 4px 12px', gap: '6px' }}>
            <AggregatedVolumeBar logs={form.readingLogs} type="read" icon={Icons.Book} titleLabel="การอ่าน" isMini />
            {form.isCollecting && <AggregatedVolumeBar logs={form.collectionLogs} type="buy" icon={Icons.Cart} titleLabel="สะสม" isMini />}
          </div>
          
          <div className="card__summary" style={{ padding: '6px 12px 10px 12px', fontSize: '0.7rem', borderTop: '1px solid rgba(255, 255, 255, 0.03)' }}>
            <p style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              <Icons.Book /> 
              <strong>อ่านแล้ว:</strong> เล่ม {stats.totalReadCount}/{stats.totalReadJP || '?'}
            </p>
            {form.isCollecting ? (
              form.collectionLogs.map(log => {
                const missingText = getMissingVolumesText(log.ranges, log.totalVolumes);
                const isComplete = missingText === 'ครบถ้วน';
                return (
                  <p key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '2px 0 0 0' }}>
                    <Icons.Cart /> 
                    <strong>{isComplete ? 'สะสมครบ' : 'ขาด'} ({log.title || FORMAT_LABEL[log.format]}):</strong>
                    <span style={{ color: isComplete ? "var(--read-color)" : "var(--accent)", fontWeight: 'bold' }}>{missingText}</span>
                  </p>
                );
              })
            ) : (
              <p style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '2px 0 0 0' }}>
                <Icons.Cart /> 
                <strong>สถานะ:</strong> อ่านอย่างเดียว
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

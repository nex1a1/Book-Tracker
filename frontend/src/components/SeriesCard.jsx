import React, { useState } from "react";
import { Icons } from "./Icons";
import { StarRating, AggregatedVolumeBar } from "./SharedUI";
import { SeriesInfoModal } from "./Modals";
import { useSeriesStore } from "../store";
import './SeriesCard.css';
import { getSeriesDerivedStats, getMissingVolumesText, TYPE_LABEL, STATUS_LABEL, FORMAT_LABEL } from "../utils";

export function SeriesCard({ series }) {
  const [showEdit, setShowEdit] = useState(false);
  const { deleteSeries, updateSeriesRating } = useSeriesStore(s => ({ deleteSeries: s.deleteSeries, updateSeriesRating: s.updateSeriesRating }));
  const stats = getSeriesDerivedStats(series);

  const renderTimeline = () => {
    const s = stats.n.publishYear || "?";
    if (stats.n.status === 'completed' || stats.n.endYear) return `${s} – ${stats.n.endYear || "จบแล้ว"}`;
    return `${s} – ปัจจุบัน`;
  };

  return (
    <div className="card">
      
      {/* 🔴 ส่วนบน: รูปปก (ซ้าย) + ข้อมูลหลัก (ขวา) */}
      <div className="card__top">
        {/* เช็กว่ามีลิงก์รูปไหม ถ้ามีโชว์รูป ถ้าไม่มีโชว์กล่องว่างๆ */}
        {stats.n.imageUrl ? (
          <img src={stats.n.imageUrl} alt={stats.n.title} className="card__cover" />
        ) : (
          <div className="card__cover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '0.7rem' }}>ไม่มีรูป</div>
        )}

        <div className="card__info">
          <div className="card__header">
            <div className="card__badges">
              <span className={`badge badge--${stats.n.type}`}>{TYPE_LABEL[stats.n.type]}</span>
              <span className={`badge badge--${stats.n.status}`}>{STATUS_LABEL[stats.n.status]}</span>
            </div>
            <div className="card__actions">
              <button className="btn-icon" title="แก้ไข" onClick={() => setShowEdit(true)}><Icons.Edit /></button>
              <button className="btn-icon btn-icon--danger" title="ลบ" onClick={() => window.confirm(`ลบ "${stats.n.title}"?`) && deleteSeries(stats.n._id)}><Icons.Trash /></button>
            </div>
          </div>
          
          <h3 className="card__title" title={stats.n.title}>{stats.n.title}</h3>
          <span className="card__timeline-label">{renderTimeline()}</span>
          <p className="card__author" title={`${stats.n.author || "?"} | ${stats.n.publisher || ""}`}>
            {stats.n.author || "?"} {stats.n.publisher ? `| ${stats.n.publisher}` : ""}
          </p>

          <div style={{ marginTop: 'auto' }}>
            <StarRating rating={stats.n.rating || 0} onRate={(r) => updateSeriesRating(stats.n._id, r)} />
          </div>
        </div>
      </div>

      {/* 🔴 ส่วนล่าง: หลอดสถานะต่างๆ วางเต็มความกว้าง */}
      <div className="volume-progress">
        <AggregatedVolumeBar logs={stats.n.readingLogs} type="read" icon={Icons.Book} titleLabel="การอ่าน (JP)" />
        {stats.n.isCollecting && <AggregatedVolumeBar logs={stats.n.collectionLogs} type="buy" icon={Icons.Cart} titleLabel="การสะสม (ไทย)" />}
      </div>

      <div className="card__summary">
        <p style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Icons.Book /> <strong>อ่านแล้ว:</strong> เล่ม {stats.totalReadCount}/{stats.totalReadJP || '?'}</p>
        {stats.n.isCollecting ? (
          stats.n.collectionLogs.map(log => {
            const missingText = getMissingVolumesText(log.ranges, log.totalVolumes);
            const isComplete = missingText === 'ครบถ้วน';
            return (
              <p key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icons.Cart /> <strong>{isComplete ? 'สะสมครบ' : 'ขาด'} ({log.title || FORMAT_LABEL[log.format]}):</strong>
                <span style={{ color: isComplete ? "var(--read-color)" : "var(--accent)", fontWeight: 'bold' }}>{missingText}</span>
              </p>
            );
          })
        ) : <p style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Icons.Cart /> <strong>สถานะ:</strong> อ่านอย่างเดียว</p>}
      </div>

      {showEdit && <SeriesInfoModal series={stats.n} onClose={() => setShowEdit(false)} />}
    </div>
  );
}

export function SeriesListItem({ series }) {
  const [showEdit, setShowEdit] = useState(false);
  const { deleteSeries, updateSeriesRating } = useSeriesStore(s => ({ deleteSeries: s.deleteSeries, updateSeriesRating: s.updateSeriesRating }));
  const stats = getSeriesDerivedStats(series);

  const renderTimeline = () => {
    const s = stats.n.publishYear || "?";
    if (stats.n.status === 'completed' || stats.n.endYear) return `${s} – ${stats.n.endYear || "จบแล้ว"}`;
    return `${s} – ปัจจุบัน`;
  };

  return (
    <div className="list-row">
      <div className="list-row__info">
        <div className="list-row__title-wrap">
          <h3 className="list-row__title" title={stats.n.title}>{stats.n.title}</h3>
          <span className="list-row__timeline">{renderTimeline()}</span>
        </div>
        <p className="list-row__author">{stats.n.author || "?"} {stats.n.publisher ? `| ${stats.n.publisher}` : ""}</p>
        <StarRating rating={stats.n.rating || 0} onRate={(r) => updateSeriesRating(stats.n._id, r)} size="xs" />
      </div>

      <div className="list-row__badges">
        <span className={`badge badge--${stats.n.type}`}>{TYPE_LABEL[stats.n.type]}</span>
        <span className={`badge badge--${stats.n.status}`}>{STATUS_LABEL[stats.n.status]}</span>
        {stats.isFinishedReading && <span className="badge badge--finished">อ่านจบแล้ว</span>}
        {stats.isCaughtUp && <span className="badge badge--caughtup">ทันปัจจุบัน</span>}
        {stats.totalReadCount > 0 && stats.n.isCollecting && <span className="badge badge--both">ทั้งอ่านทั้งเก็บ</span>}
        {stats.totalReadCount > 0 && !stats.n.isCollecting && <span className="badge badge--read-only">อ่านอย่างเดียว</span>}
        {stats.isUnread && stats.n.isCollecting && <span className="badge badge--collect-only">สายดอง</span>}
      </div>

      <div className="list-row__bars">
        <AggregatedVolumeBar logs={stats.n.readingLogs} type="read" icon={Icons.Book} titleLabel="อ่าน" isMini />
        {stats.n.isCollecting && <AggregatedVolumeBar logs={stats.n.collectionLogs} type="buy" icon={Icons.Cart} titleLabel="สะสม" isMini />}
      </div>

      <div className="list-row__missing">
        {stats.n.isCollecting ? (
          stats.n.collectionLogs.map(log => {
            const missingText = getMissingVolumesText(log.ranges, log.totalVolumes);
            const isComplete = missingText === 'ครบถ้วน';
            return (
              <div key={log.id} style={{ display: 'flex', flexDirection: 'column', marginBottom: '2px' }}>
                <span className="label">{isComplete ? 'สะสมครบ' : 'ขาด'} {log.title ? `(${log.title})` : `(${FORMAT_LABEL[log.format]})`}</span>
                <span className="value" style={{ color: isComplete ? 'var(--read-color)' : 'var(--special-color)' }}>{missingText}</span>
              </div>
            );
          })
        ) : <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>อ่านอย่างเดียว</span>}
      </div>

      <div className="list-row__actions">
        <button className="btn-icon" title="แก้ไข" onClick={() => setShowEdit(true)}><Icons.Edit /></button>
        <button className="btn-icon btn-icon--danger" title="ลบ" onClick={() => window.confirm(`ลบ "${stats.n.title}"?`) && deleteSeries(stats.n._id)}><Icons.Trash /></button>
      </div>
      {showEdit && <SeriesInfoModal series={stats.n} onClose={() => setShowEdit(false)} />}
    </div>
  );
}
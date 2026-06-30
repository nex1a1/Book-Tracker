import React, { useState } from "react";
import { Icons } from "../../../components/Icons";
import { StarRating } from "../../../components/StarRating";
import { AggregatedVolumeBar } from "./AggregatedVolumeBar";
import { SeriesInfoModal } from "./SeriesInfoModal";
import { useSeriesStore } from "../../../store/useSeriesStore";
import { getSeriesDerivedStats, getMissingVolumesText } from "../../../utils/helpers";
import { TYPE_LABEL, STATUS_LABEL, FORMAT_LABEL } from "../../../utils/constants";
import { Series } from "../../../types";
import '../Series.css';

interface SeriesCardProps {
  series: Series;
}

export function SeriesCard({ series }: SeriesCardProps) {
  const [showEdit, setShowEdit] = useState(false);
  const deleteSeries = useSeriesStore(s => s.deleteSeries);
  const updateSeriesRating = useSeriesStore(s => s.updateSeriesRating);
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
        <div className="card__cover-wrapper">
          {/* เช็กว่ามีลิงก์รูปไหม ถ้ามีโชว์รูป ถ้าไม่มีโชว์กล่องว่างๆ */}
          {stats.n.imageUrl ? (
            <img src={stats.n.imageUrl} alt={stats.n.title} className="card__cover" />
          ) : (
            <div className="card__cover-empty">
              <span>ไม่มีรูป</span>
            </div>
          )}
        </div>

        <div className="card__info">
          <div className="card__header">
            <div className="card__badges">
              <span className={`badge badge--${stats.n.type}`}>{TYPE_LABEL[stats.n.type]}</span>
              <span className={`badge badge--${stats.n.status}`}>{STATUS_LABEL[stats.n.status]}</span>
            </div>
            
            {/* Sleek Action Buttons (Accessible Cluster) */}
            <div className="card__actions">
              <button 
                type="button"
                className="btn-icon card__action-btn card__action-btn--edit" 
                title="แก้ไข" 
                onClick={() => setShowEdit(true)}
              >
                <Icons.Edit />
              </button>
              <button 
                type="button"
                className="btn-icon btn-icon--danger card__action-btn card__action-btn--danger" 
                title="ลบ" 
                onClick={() => window.confirm(`ลบ "${stats.n.title}"?`) && deleteSeries(stats.n._id)}
              >
                <Icons.Trash />
              </button>
            </div>
          </div>
          
          <h3 className="card__title" title={stats.n.title}>{stats.n.title}</h3>
          
          <div className="card__meta-details">
            <span className="card__timeline-label">{renderTimeline()}</span>
            <p className="card__author" title={`${stats.n.author || "?"} | ${stats.n.publisher || ""}`}>
              {stats.n.author || "?"} {stats.n.publisher ? `| ${stats.n.publisher}` : ""}
            </p>
          </div>

          <div className="card__rating-wrap">
            <StarRating rating={stats.n.rating || 0} onRate={(r) => updateSeriesRating(stats.n._id, r)} />
          </div>
        </div>
      </div>

      {/* 🔴 ส่วนล่าง: หลอดสถานะต่างๆ วางเต็มความกว้าง */}
      <div className="volume-progress">
        <AggregatedVolumeBar logs={stats.n.readingLogs} type="read" icon={Icons.Book} titleLabel="การอ่าน" />
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
                <Icons.Cart /> <strong>{isComplete ? 'สะสมครบ' : 'ขาด'} ({log.title || FORMAT_LABEL[log.format || 'normal']}):</strong>
                <span className={`summary-status-pill ${isComplete ? 'complete' : 'missing'}`}>{missingText}</span>
              </p>
            );
          })
        ) : <p style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Icons.Cart /> <strong>สถานะ:</strong> อ่านอย่างเดียว</p>}
      </div>

      {showEdit && <SeriesInfoModal series={stats.n} onClose={() => setShowEdit(false)} />}
    </div>
  );
}

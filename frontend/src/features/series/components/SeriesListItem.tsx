import React, { useState } from "react";
import { Icons } from "../../../components/Icons";
import { StarRating } from "../../../components/StarRating";
import { AggregatedVolumeBar } from "./AggregatedVolumeBar";
import { SeriesInfoModal } from "./SeriesInfoModal";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { useSeriesStore } from "../../../store/useSeriesStore";
import { getSeriesDerivedStats, getMissingVolumesText } from "../../../utils/helpers";
import { TYPE_LABEL, STATUS_LABEL, FORMAT_LABEL } from "../../../utils/constants";
import { Series } from "../../../types";
import '../Series.css';

interface SeriesListItemProps {
  series: Series;
}

export function SeriesListItem({ series }: SeriesListItemProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteSeries = useSeriesStore(s => s.deleteSeries);
  const updateSeriesRating = useSeriesStore(s => s.updateSeriesRating);
  const stats = getSeriesDerivedStats(series);

  const renderTimeline = () => {
    const s = stats.n.publishYear || "?";
    if (stats.n.status === 'completed' || stats.n.endYear) return `${s} – ${stats.n.endYear || "จบแล้ว"}`;
    return `${s} – ปัจจุบัน`;
  };

  return (
    <div className={`list-row list-row--${stats.n.status}`}>
      
      {/* Column 1: cover wrapper */}
      <div className="list-row__cover-wrapper">
        {stats.n.imageUrl ? (
          <img src={stats.n.imageUrl} alt={stats.n.title} className="list-row__cover" />
        ) : (
          <div className="list-row__cover--empty">ไม่มีรูป</div>
        )}
      </div>

      {/* Column 2: Info Block */}
      <div className="list-row__info">
        <h3 className="list-row__title" title={stats.n.title}>{stats.n.title}</h3>
        <span className="list-row__timeline">{renderTimeline()}</span>
        <p className="list-row__author" title={`${stats.n.author || "?"} ${stats.n.publisher ? `| ${stats.n.publisher}` : ""}`}>
          {stats.n.author || "?"} {stats.n.publisher ? `| ${stats.n.publisher}` : ""}
        </p>
      </div>

      {/* Column 3: Badge Cluster */}
      <div className="list-row__badges">
        <span className={`badge badge--${stats.n.type}`}>{TYPE_LABEL[stats.n.type]}</span>
        <span className={`badge badge--${stats.n.status}`}>{STATUS_LABEL[stats.n.status]}</span>
        {stats.isFinishedReading && <span className="badge badge--finished">อ่านจบแล้ว</span>}
        {stats.isCaughtUp && <span className="badge badge--caughtup">ทันปัจจุบัน</span>}
        {stats.totalReadCount > 0 && stats.n.isCollecting && <span className="badge badge--both">ทั้งอ่านทั้งเก็บ</span>}
        {stats.totalReadCount > 0 && !stats.n.isCollecting && <span className="badge badge--read-only">อ่านอย่างเดียว</span>}
        {stats.isUnread && stats.n.isCollecting && <span className="badge badge--collect-only">สายดอง</span>}
        {stats.n.isCollectingStopped && <span className="badge badge--stopped">เลิกตามแล้ว</span>}
      </div>

      {/* Column 4: mini progress bars */}
      <div className="list-row__bars">
        <AggregatedVolumeBar logs={stats.n.readingLogs} type="read" icon={Icons.Book} titleLabel="อ่าน" isMini />
        {stats.n.isCollecting && <AggregatedVolumeBar logs={stats.n.collectionLogs} type="buy" icon={Icons.Cart} titleLabel="สะสม" isMini />}
      </div>

      {/* Column 5: Stock/Missing Volumes Status — capped to one pill so multi-format
          series don't stretch the row taller than its neighbors; the rest are one click away. */}
      <div className="list-row__missing">
        {stats.n.isCollecting ? (() => {
          if (stats.n.isCollectingStopped) {
            return (
              <div className="list-row__missing-pill stopped">
                <span className="list-row__missing-label" title="เลิกตามแล้ว">
                  เลิกตามแล้ว
                </span>
                <span className="list-row__missing-value" title="เลิกตามแล้ว">
                  เลิกตามแล้ว
                </span>
              </div>
            );
          }
          const logs = stats.n.collectionLogs;
          const primaryLog = logs.find(log => getMissingVolumesText(log.ranges, log.totalVolumes) !== 'ครบถ้วน') || logs[0];
          const missingText = getMissingVolumesText(primaryLog.ranges, primaryLog.totalVolumes);
          const isComplete = missingText === 'ครบถ้วน';
          const extraCount = logs.length - 1;
          const labelText = isComplete
            ? 'สะสมครบ'
            : `ขาด ${primaryLog.title ? `(${primaryLog.title})` : `(${FORMAT_LABEL[primaryLog.format || 'normal']})`}`;
          return (
            <>
              <div className={`list-row__missing-pill ${isComplete ? 'complete' : 'missing'}`}>
                <span className="list-row__missing-label" title={labelText}>
                  {labelText}
                </span>
                <span className="list-row__missing-value" title={missingText}>
                  {missingText}
                </span>
              </div>
              {extraCount > 0 && (
                <button
                  type="button"
                  className="list-row__missing-more"
                  onClick={() => setShowEdit(true)}
                  title="ดูรูปแบบสะสมทั้งหมดในหน้าต่างแก้ไข"
                >
                  +{extraCount} รูปแบบ
                </button>
              )}
            </>
          );
        })() : (
          <span className="list-row__missing-read-only">อ่านอย่างเดียว</span>
        )}
      </div>

      {/* Column 6: Star Rating */}
      <div className="list-row__rating">
        <StarRating rating={stats.n.rating || 0} onRate={(r) => updateSeriesRating(stats.n._id, r)} size="xs" />
      </div>

      {/* Column 7: Actions Panel */}
      <div className="list-row__actions">
        <button 
          type="button"
          className="list-row__action-btn list-row__action-btn--edit" 
          title="แก้ไข" 
          onClick={() => setShowEdit(true)}
        >
          <Icons.Edit />
        </button>
        <button 
          type="button"
          className="list-row__action-btn list-row__action-btn--danger" 
          title="ลบ"
          onClick={() => setShowDeleteConfirm(true)}
        >
          <Icons.Trash />
        </button>
      </div>

      {showEdit && <SeriesInfoModal series={stats.n} onClose={() => setShowEdit(false)} />}
      {showDeleteConfirm && (
        <ConfirmDeleteModal
          series={stats.n}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={() => { deleteSeries(stats.n._id); setShowDeleteConfirm(false); }}
        />
      )}
    </div>
  );
}
